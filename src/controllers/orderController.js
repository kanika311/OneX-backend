import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { ApiError } from "../utils/helpers.js";

function formatOrder(doc) {
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    ...o,
    itemCount: o.items?.reduce((n, i) => n + (i.quantity || 1), 0) ?? 0,
  };
}

export async function createOrder(req, res) {
  const { customerName, customerEmail, customerPhone, items, notes } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "Cart is empty");
  }

  const normalized = items.map((item) => ({
    cartKey: String(item.cartKey),
    offeringId: String(item.offeringId || ""),
    type: item.type === "service" ? "service" : "course",
    title: String(item.title),
    price: Number(item.price),
    quantity: Math.max(1, Number(item.quantity) || 1),
    image: String(item.image || ""),
    duration: String(item.duration || ""),
  }));

  const subtotal = normalized.reduce((sum, i) => sum + i.price * i.quantity, 0);

  const order = await Order.create({
    user: req.user?._id ?? null,
    customerName: customerName.trim(),
    customerEmail: customerEmail.trim().toLowerCase(),
    customerPhone: (customerPhone || "").trim(),
    items: normalized,
    subtotal,
    notes: (notes || "").trim(),
    status: "pending",
  });

  res.status(201).json({ success: true, order: formatOrder(order) });
}

export async function listCustomers(_req, res) {
  const users = await User.find({ role: "user" })
    .select("name email createdAt")
    .sort({ createdAt: -1 })
    .lean();

  let orderStats = [];
  let guestStats = [];
  try {
    orderStats = await Order.aggregate([
      { $match: { user: { $ne: null } } },
      {
        $group: {
          _id: "$user",
          orderCount: { $sum: 1 },
          lastOrderAt: { $max: "$createdAt" },
          totalSpent: { $sum: "$subtotal" },
        },
      },
    ]);
    guestStats = await Order.aggregate([
      { $match: { user: null } },
      {
        $group: {
          _id: "$customerEmail",
          name: { $last: "$customerName" },
          phone: { $last: "$customerPhone" },
          orderCount: { $sum: 1 },
          lastOrderAt: { $max: "$createdAt" },
          totalSpent: { $sum: "$subtotal" },
        },
      },
      { $sort: { lastOrderAt: -1 } },
    ]);
  } catch {
    /* orders collection may be empty — still return registered users */
  }

  const statsByUser = new Map(orderStats.map((s) => [String(s._id), s]));

  const registered = users.map((u) => {
    const stats = statsByUser.get(String(u._id));
    return {
      id: String(u._id),
      name: u.name,
      email: u.email,
      registeredAt: u.createdAt,
      orderCount: stats?.orderCount ?? 0,
      lastOrderAt: stats?.lastOrderAt ?? null,
      totalSpent: stats?.totalSpent ?? 0,
      source: "registered",
    };
  });

  const guests = guestStats.map((g) => ({
    id: null,
    name: g.name,
    email: g._id,
    phone: g.phone,
    registeredAt: null,
    orderCount: g.orderCount,
    lastOrderAt: g.lastOrderAt,
    totalSpent: g.totalSpent,
    source: "guest",
  }));

  const customers = [...registered, ...guests].sort((a, b) => {
    const aTime = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
    const bTime = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime();
  });

  res.json({ success: true, customers, registeredCount: registered.length });
}

export async function listOrders(req, res) {
  const { status, email, limit = 100 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (email) filter.customerEmail = String(email).toLowerCase();

  const orders = await Order.find(filter)
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .limit(Number(limit))
    .lean();

  res.json({
    success: true,
    total: orders.length,
    orders: orders.map((o) => ({
      ...o,
      itemCount: o.items?.reduce((n, i) => n + (i.quantity || 1), 0) ?? 0,
    })),
  });
}

export async function getOrder(req, res) {
  const order = await Order.findById(req.params.id).populate("user", "name email");
  if (!order) throw new ApiError(404, "Order not found");
  res.json({ success: true, order: formatOrder(order) });
}

export async function updateOrderStatus(req, res) {
  const { status } = req.body;
  if (!["pending", "confirmed", "cancelled"].includes(status)) {
    throw new ApiError(400, "Invalid status");
  }
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");
  order.status = status;
  await order.save();
  res.json({ success: true, order: formatOrder(order) });
}
