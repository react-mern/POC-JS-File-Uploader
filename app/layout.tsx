import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import UploadManagerInitializer from '@/components/file-uploader/UploadManagerInitializer';
import Navbar from '@/components/navbar/Navbar';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'File Uploader',
  description: 'Efficient and user-friendly file uploading solution',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <UploadManagerInitializer />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
