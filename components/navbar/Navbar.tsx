"use client"
import Link from 'next/link';
import { Button } from '../ui/button';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();
  const isGalleryPage = pathname === '/image-gallery';

  return (
    <nav className="w-full bg-gray-800 p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-white text-xl font-bold">File Uploader</div>
        <Link href={isGalleryPage ? "/" : "/image-gallery"}>
          <Button className="bg-blue-500 text-white hover:bg-blue-600">
            {isGalleryPage ? "Add Uploads" : "Go To Gallery"}
          </Button>
        </Link>
      </div>
    </nav>
  );
}
