import "dotenv/config";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";

const email = process.env.ADMIN_EMAIL || "admin@1x-dr-ayesha.com";
const password = process.env.ADMIN_PASSWORD || "Admin@12345";

async function run() {
  await connectDB();
  let admin = await User.findOne({ email });
  if (!admin) {
    admin = await User.create({ name: "Admin", email, password, role: "admin" });
    console.log("Admin created:", email);
  } else {
    admin.role = "admin";
    admin.password = password;
    await admin.save();
    console.log("Admin updated:", email);
  }
  console.log("Sign in at http://localhost:3001/login");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
