import "dotenv/config";
import { connectDB } from "../config/db.js";
import { User } from "../models/User.js";

const name = process.env.SUPER_ADMIN_NAME || "Super Admin";
const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@1x-dr-ayesha.com";
const phone = process.env.SUPER_ADMIN_PHONE || "9876543210";
const password = process.env.SUPER_ADMIN_PASSWORD || "Super@12345";

async function run() {
  await connectDB();

  let admin = await User.findOne({ email });

  if (!admin) {
    admin = await User.create({
      name,
      email,
      number: phone,
      password,
      role: "super_admin",
      isActive: true,
    });
    console.log("Super Admin created:", email);
  } else {
    admin.name = name;
    admin.number = phone;
    admin.role = "super_admin";
    admin.isActive = true;
    admin.password = password;
    await admin.save();
    console.log("Super Admin updated:", email);
  }

  console.log("Sign in at http://localhost:3001/login");
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
