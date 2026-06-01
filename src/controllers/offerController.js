import { Offer } from "../models/Offer.js";
import { ApiError } from "../utils/helpers.js";

async function findOffer(id) {
  let offer = await Offer.findById(id).catch(() => null);
  if (!offer) offer = await Offer.findOne({ slug: id });
  if (!offer) throw new ApiError(404, "Offer not found");
  return offer;
}

export async function listOffers(req, res) {
  const filter = {};
  if (!req.user || req.user.role !== "admin") filter.active = true;
  else if (req.query.active !== undefined) filter.active = req.query.active === "true";

  const offers = await Offer.find(filter).sort({ sortOrder: 1, createdAt: -1 });
  res.json({ success: true, total: offers.length, offers });
}

export async function getOffer(req, res) {
  const offer = await findOffer(req.params.id);
  res.json({ success: true, offer });
}

export async function createOffer(req, res) {
  const offer = await Offer.create(req.body);
  res.status(201).json({ success: true, offer });
}

export async function updateOffer(req, res) {
  const offer = await findOffer(req.params.id);
  Object.assign(offer, req.body);
  await offer.save();
  res.json({ success: true, offer });
}

export async function deleteOffer(req, res) {
  const offer = await findOffer(req.params.id);
  const hard = req.query.hard === "true";
  if (hard) {
    await offer.deleteOne();
    return res.json({ success: true, message: "Offer deleted permanently" });
  }
  offer.active = false;
  await offer.save();
  res.json({ success: true, message: "Offer deactivated" });
}
