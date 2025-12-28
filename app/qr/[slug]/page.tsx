import { redirect, notFound } from 'next/navigation';
import { getQRCodeByShortUrlServer, incrementQRCodeScansServer } from '@/lib/supabase/qrCodesServer';

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function QRRedirectPage({ params }: PageProps) {
  const { slug } = params;

  try {
    const qrCode = await getQRCodeByShortUrlServer(slug);

    if (!qrCode) {
      notFound();
    }

    // Only increment scans for active QR codes
    if (qrCode.status === 'active') {
      try {
        await incrementQRCodeScansServer(slug);
      } catch (error) {
        // Log error but don't fail the redirect
        console.error('Failed to increment scan count:', error);
      }
    }

    // Redirect to the payload URL
    redirect(qrCode.payload);
  } catch (error) {
    console.error('Error redirecting QR code:', error);
    notFound();
  }
}

