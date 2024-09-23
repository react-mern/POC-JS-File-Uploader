'use server';

import { revalidateTag } from 'next/cache';

export const revalidateImages = async () => {
  revalidateTag('images');
};
