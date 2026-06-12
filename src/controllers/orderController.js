import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { ApiError, normalizePhone } from "../utils/helpers.js";

function phoneDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function phonesMatch(a, b) {
  const da = phoneDigits(a);
  const db = phoneDigits(b);
  if (!da || !db || da.length < 10 || db.length < 10) return false;
  if (da === db) return true;
  return da.slice(-10) === db.slice(-10);
}

async function resolveUserPhone(user) {
  const stored = user.number || user.phone || "";
  if (phoneDigits(stored).length >= 10) return stored;

  const order = await Order.findOne({ user: user._id })
    .sort({ createdAt: -1 })
    .select("customerPhone")
    .lean();
  if (order?.customerPhone && phoneDigits(order.customerPhone).length >= 10) {
    return order.customerPhone;
  }

  const anyOrder = await Order.findOne({
    user: user._id,
    customerPhone: { $exists: true, $ne: "" },
  })
    .sort({ createdAt: -1 })
    .select("customerPhone")
    .lean();
  return anyOrder?.customerPhone || stored;
}

function customerDto(fields) {
  return {
    id: fields.id ?? null,
    name: fields.name || "",
    number: fields.number || "",
    phone: fields.phone || fields.number || "",
    email: fields.email || "",
    registeredAt: fields.registeredAt ?? null,
    orderCount: fields.orderCount ?? 0,
    lastOrderAt: fields.lastOrderAt ?? null,
    totalSpent: fields.totalSpent ?? 0,
    source: fields.source,
  };
}

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

  const normalized = items.map((item) => {
    let type = "course";
    if (item.type === "service") type = "service";
    if (item.type === "membership") type = "membership";
    return {
      cartKey: String(item.cartKey),
      offeringId: String(item.offeringId || ""),
      type,
      title: String(item.title),
      price: Number(item.price),
      quantity: Math.max(1, Number(item.quantity) || 1),
      image: String(item.image || ""),
      duration: String(item.duration || ""),
    };
  });

  const lineSubtotal = normalized.reduce((sum, i) => sum + i.price * i.quantity, 0);

  let promoCode = String(req.body.promoCode || "").trim().toUpperCase();
  let discountPercent = Math.min(5, Math.max(0, Number(req.body.discountPercent) || 0));
  let discountAmount = Math.max(0, Number(req.body.discountAmount) || 0);

  const spinMatch = promoCode.match(/^SPIN([0-5])-[A-Z0-9]{4}$/);
  if (spinMatch) {
    discountPercent = Number(spinMatch[1]);
    if (discountPercent < 1) {
      promoCode = "";
      discountPercent = 0;
      discountAmount = 0;
    } else {
      discountAmount = Math.min(
        lineSubtotal,
        discountAmount > 0 ? discountAmount : Math.round((lineSubtotal * discountPercent) / 100),
      );
    }
  } else {
    promoCode = "";
    discountPercent = 0;
    discountAmount = 0;
  }

  const subtotal = Math.max(0, lineSubtotal - discountAmount);

  const linkedUser = req.user?._id ?? null;
  const normalizedPhone = customerPhone ? normalizePhone(customerPhone) || phoneDigits(customerPhone) : "";
  const accountPhone = req.user?.number ? normalizePhone(req.user.number) || req.user.number : "";

  const order = await Order.create({
    user: linkedUser,
    customerName: customerName.trim(),
    customerEmail: customerEmail.trim().toLowerCase(),
    customerPhone: normalizedPhone || accountPhone || (customerPhone || "").trim(),
    items: normalized,
    lineSubtotal,
    promoCode: promoCode || undefined,
    discountPercent: discountPercent || undefined,
    discountAmount: discountAmount || undefined,
    subtotal,
    notes: (notes || "").trim(),
    status: "pending",
    paymentStatus: "awaiting",
  });

  res.status(201).json({ success: true, order: formatOrder(order) });
}

export async function submitOrderPayment(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");
  if (order.status === "cancelled") {
    throw new ApiError(400, "This order was cancelled");
  }
  if (order.paymentStatus === "confirmed") {
    throw new ApiError(400, "Payment already confirmed for this order");
  }

  const paymentReference = String(req.body?.paymentReference ?? "").trim();
  if (paymentReference.length < 4) {
    throw new ApiError(400, "Enter your UPI transaction ID or reference number (at least 4 characters)");
  }

  order.paymentReference = paymentReference;
  order.paymentStatus = "submitted";
  order.paymentSubmittedAt = new Date();
  await order.save();
  res.json({ success: true, order: formatOrder(order) });
}

export async function listMyOrders(req, res) {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json({
    success: true,
    orders: orders.map((o) => ({
      ...o,
      itemCount: o.items?.reduce((n, i) => n + (i.quantity || 1), 0) ?? 0,
    })),
  });
}

export async function listCustomers(_req, res) {
  const users = await User.find({ role: "user" })
    .select("name number email createdAt")
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
          phone: { $last: "$customerPhone" },
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

  const registered = await Promise.all(
    users.map(async (u) => {
      const stats = statsByUser.get(String(u._id));
      let number = String(u.number || "").trim();
      if (phoneDigits(number).length < 10 && stats?.phone && phoneDigits(stats.phone).length >= 10) {
        number = stats.phone;
      }
      if (phoneDigits(number).length < 10) {
        number = await resolveUserPhone(u);
      }
      return customerDto({
        id: String(u._id),
        name: u.name,
        number,
        phone: number,
        email: u.email || "",
        registeredAt: u.createdAt,
        orderCount: stats?.orderCount ?? 0,
        lastOrderAt: stats?.lastOrderAt ?? null,
        totalSpent: stats?.totalSpent ?? 0,
        source: "registered",
      });
    }),
  );

  const guests = [];
  for (const g of guestStats) {
    const guestRow = customerDto({
      id: null,
      name: g.name,
      number: g.phone || "",
      phone: g.phone || "",
      email: g._id,
      registeredAt: null,
      orderCount: g.orderCount,
      lastOrderAt: g.lastOrderAt,
      totalSpent: g.totalSpent,
      source: "guest",
    });

    let match = registered.find((r) => phonesMatch(r.number, g.phone));
    if (!match && g.phone) {
      const tail = phoneDigits(g.phone).slice(-10);
      if (tail.length === 10) {
        const dbUser = await User.findOne({
          role: "user",
          number: new RegExp(`${tail}$`),
        }).lean();
        if (dbUser) {
          match = registered.find((r) => r.id === String(dbUser._id));
          if (match && !match.number) match.number = dbUser.number || g.phone;
        }
      }
    }
    if (match) {
      match.orderCount += guestRow.orderCount;
      match.totalSpent += guestRow.totalSpent;
      if (
        guestRow.lastOrderAt &&
        (!match.lastOrderAt || new Date(guestRow.lastOrderAt) > new Date(match.lastOrderAt))
      ) {
        match.lastOrderAt = guestRow.lastOrderAt;
      }
      if (!match.number && guestRow.number) match.number = guestRow.number;
      continue;
    }
    guests.push(guestRow);
  }

  const customers = [...registered, ...guests].sort((a, b) => {
    const aTime = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
    const bTime = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime();
  });

  res.json({ success: true, customers, registeredCount: registered.length });
}

/** Save missing phone on user accounts from their orders */
export async function repairCustomerPhones(_req, res) {
  const users = await User.find({ role: "user" });
  let fixed = 0;
  for (const u of users) {
    if (phoneDigits(u.number).length >= 10) continue;
    const phone = await resolveUserPhone(u);
    const normalized = normalizePhone(phone) || phoneDigits(phone);
    if (normalized.length < 10) continue;
    await User.updateOne({ _id: u._id }, { $set: { number: normalized } });
    fixed += 1;
  }
  res.json({ success: true, message: `Updated ${fixed} user phone(s)`, fixed });
}

export async function listOrders(req, res) {
  const { status, email, phone, userId, limit = 100 } = req.query;
  const filter = {};
  if (status) filter.status = status;
  if (userId) filter.user = userId;
  if (email) filter.customerEmail = String(email).toLowerCase();
  if (phone) {
    const digits = String(phone).replace(/\D/g, "");
    if (digits) filter.customerPhone = new RegExp(digits);
  }

  const orders = await Order.find(filter)
    .populate("user", "name number email")
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
  const order = await Order.findById(req.params.id).populate("user", "name number email");
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
  if (status === "confirmed") order.paymentStatus = "confirmed";
  if (status === "cancelled" && order.paymentStatus === "awaiting") {
    order.paymentStatus = "awaiting";
  }
  await order.save();
  res.json({ success: true, order: formatOrder(order) });
}
