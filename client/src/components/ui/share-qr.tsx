import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Share2, Copy, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import QRCode from "qrcode";

export function ShareQR() {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const generateQR = async () => {
    try {
      const url = window.location.origin;
      const qrUrl = await QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('QR code generation failed:', error);
      toast({
        title: "Error",
        description: "Failed to generate QR code",
        variant: "destructive"
      });
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    generateQR();
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      toast({
        title: "Copied!",
        description: "App URL copied to clipboard"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy URL",
        variant: "destructive"
      });
    }
  };

  const downloadQR = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.download = 'triplace-qr-code.png';
      link.href = qrCodeUrl;
      link.click();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" onClick={handleOpen}>
          <Share2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Share TriPlace</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {qrCodeUrl && (
            <div className="flex justify-center">
              <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={copyToClipboard} className="flex-1">
              <Copy className="w-4 h-4 mr-2" />
              Copy URL
            </Button>
            <Button onClick={downloadQR} variant="outline" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download QR
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}