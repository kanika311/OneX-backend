import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { Offer } from "../models/Offer.js";
import { Cart } from "../models/Cart.js";
import { Wishlist } from "../models/Wishlist.js";
import { Order } from "../models/Order.js";

export async function dashboardStats(_req, res) {
  const [products, offers, users, carts, wishlists, orders, pendingOrders] = await Promise.all([
    Product.countDocuments(),
    Offer.countDocuments(),
    User.countDocuments({ role: "user" }),
    Cart.countDocuments(),
    Wishlist.countDocuments(),
    Order.countDocuments(),
    Order.countDocuments({ status: "pending" }),
  ]);
  res.json({
    success: true,
    stats: {
      products,
      activeProducts: await Product.countDocuments({ active: true }),
      offers,
      activeOffers: await Offer.countDocuments({ active: true }),
      users,
      carts,
      wishlists,
      orders,
      pendingOrders,
    },
  });
}
