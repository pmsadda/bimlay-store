"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export async function addProductReview(formData: FormData) {
  const productId = formData.get("productId") as string;
  const userName = formData.get("userName") as string;
  const rating = Number(formData.get("rating"));
  const comment = formData.get("comment") as string;
  const imageUrl = formData.get("imageUrl") as string;

  if (!productId || !userName || !rating) {
    throw new Error("Porojoniyo field gulo puron korun.");
  }

  await db.review.create({
    data: {
      productId,
      userName,
      rating,
      comment,
      imageUrl: imageUrl || null,
    },
  });

  revalidatePath(`/products/${productId}`);
}