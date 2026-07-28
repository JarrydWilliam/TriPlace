import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useLocation, Link } from 'wouter';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ComponentLoadingSpinner } from '@/components/loading-spinner';
import { CURRENT_TERMS_VERSION } from '@shared/schema';
import { AlertCircle, ChevronUp, ChevronDown } from 'lucide-react';

// ── Scroll-wheel column ──────────────────────────────────────────────────────
function WheelColumn({
  items,
  selected,
  onSelect,
  label,
}: {
  items: string[];
  selected: string;
  onSelect: (v: string) => void;
  label: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isProgrammatic = useRef(false);
  const ITEM_H = 44; // px per row

  const selectedIndex = items.indexOf(selected);

  // Sync scroll position when selection changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const targetTop = Math.max(0, selectedIndex) * ITEM_H;
    if (Math.abs(el.scrollTop - targetTop) > 2) {
      isProgrammatic.current = true;
      el.scrollTop = targetTop;
      requestAnimationFrame(() => {
        isProgrammatic.current = false;
      });
    }
  }, [selectedIndex, items]);

  const handleScroll = () => {
    if (isProgrammatic.current) return;
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_H);
    const clamped = Math.max(0, Math.min(idx, items.length - 1));
    if (items[clamped] !== selected) onSelect(items[clamped]);
  };

  const step = (delta: number) => {
    const next = Math.max(0, Math.min(selectedIndex + delta, items.length - 1));
    onSelect(items[next]);
  };

  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-xs text-white/40 uppercase tracking-widest mb-1">{label}</span>

      {/* Up arrow */}
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={selectedIndex === 0}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 disabled:opacity-20 transition-colors active:scale-90"
      >
        <ChevronUp className="w-5 h-5" />
      </button>

      {/* Scroll drum */}
      <div className="relative w-full" style={{ height: ITEM_H * 3 }}>
        {/* Frosted selection highlight */}
        <div
          className="absolute left-0 right-0 bg-white/10 rounded-xl border border-white/15 pointer-events-none z-10"
          style={{ top: ITEM_H, height: ITEM_H }}
        />

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="absolute inset-0 overflow-y-scroll no-scrollbar"
          style={{ scrollSnapType: 'y mandatory' }}
        >
          {/* Top padding */}
          <div style={{ height: ITEM_H }} />
          {items.map((item) => (
            <div
              key={item}
              onClick={() => onSelect(item)}
              style={{ height: ITEM_H, scrollSnapAlign: 'center' }}
              className={`flex items-center justify-center cursor-pointer select-none transition-all duration-150 ${
                item === selected
                  ? 'text-white font-semibold text-lg'
                  : 'text-white/30 text-base'
              }`}
            >
              {item}
            </div>
          ))}
          {/* Bottom padding */}
          <div style={{ height: ITEM_H }} />
        </div>
      </div>

      {/* Down arrow */}
      <button
        type="button"
        onClick={() => step(1)}
        disabled={selectedIndex === items.length - 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/80 disabled:opacity-20 transition-colors active:scale-90"
      >
        <ChevronDown className="w-5 h-5" />
      </button>
    </div>
  );
}

// ── Data ─────────────────────────────────────────────────────────────────────
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const MONTH_NUMS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

function daysInMonth(month: string, year: string) {
  const m = parseInt(MONTH_NUMS[month] ?? '01', 10);
  const y = parseInt(year, 10) || 2000;
  return new Date(y, m, 0).getDate();
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1900 + 1 }, (_, i) =>
  String(currentYear - i)
);

// ── Main component ────────────────────────────────────────────────────────────
export default function CompleteProfile() {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const defaultYear = String(currentYear - 25);
  const [month, setMonth] = useState('Jan');
  const [day, setDay] = useState('1');
  const [year, setYear] = useState(defaultYear);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState('');

  // Clamp day when month/year changes
  const maxDay = daysInMonth(month, year);
  const days = Array.from({ length: maxDay }, (_, i) => String(i + 1));
  useEffect(() => {
    if (parseInt(day) > maxDay) setDay(String(maxDay));
  }, [month, year, maxDay, day]);

  const getDateOfBirth = (): string => {
    const m = MONTH_NUMS[month];
    const d = day.padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  const getAge = (): number => {
    const dob = new Date(getDateOfBirth());
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  };

  const updateComplianceMutation = useMutation({
    mutationFn: async (data: { dateOfBirth: string; termsVersion: string }) => {
      const response = await apiRequest('PATCH', '/api/users/me/compliance', data);
      return response.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(['/api/users', updatedUser.id], updatedUser);
      refreshUser();
      toast({ title: 'Welcome to SameVibe!', description: 'Your profile is complete.' });
      setLocation('/dashboard');
    },
    onError: (err: any) => {
      let displayMsg = 'Something went wrong. Please try again.';
      const raw: string = err.message ?? '';

      const jsonMatch = raw.match(/\{.*?\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.message) displayMsg = parsed.message;
        } catch (_) {}
      } else if (raw) {
        displayMsg = raw.replace(/^\d+:\s*/, '');
      }

      if (displayMsg.toLowerCase().includes('forbidden') && !displayMsg.includes('18')) {
        displayMsg = 'Authentication error. Please sign out and sign back in.';
      }

      setError(displayMsg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!termsAccepted) {
      setError('You must accept the Terms of Service to continue.');
      return;
    }

    if (getAge() < 18) {
      setError('You must be at least 18 years old to use SameVibe.');
      return;
    }

    updateComplianceMutation.mutate({
      dateOfBirth: getDateOfBirth(),
      termsVersion: CURRENT_TERMS_VERSION,
    });
  };

  if (updateComplianceMutation.isPending) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <ComponentLoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4 safe-area-top safe-area-bottom relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-[#9b87f5]/20 blur-[120px]" />
      </div>

      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            One quick step
          </h1>
          <p className="text-sm text-white/50 leading-relaxed">
            SameVibe is for adults only. Confirm your date of birth to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Date wheel picker */}
          <div className="rounded-2xl bg-card/40 backdrop-blur-xl border border-white/8 p-4">
            <p className="text-xs text-white/40 uppercase tracking-widest text-center mb-3">
              Date of Birth
            </p>
            <div className="flex gap-2">
              <WheelColumn items={MONTHS} selected={month} onSelect={setMonth} label="Month" />
              <WheelColumn items={days} selected={day} onSelect={setDay} label="Day" />
              <WheelColumn items={YEARS} selected={year} onSelect={setYear} label="Year" />
            </div>

            {/* Live age preview */}
            <div className="mt-3 text-center">
              {getAge() >= 18 ? (
                <span className="text-xs text-emerald-400/80">✓ Age verified ({getAge()} years old)</span>
              ) : (
                <span className="text-xs text-white/30">You must be 18 or older to join</span>
              )}
            </div>
          </div>

          {/* Terms */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-black/20 border border-white/5">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked: any) => setTermsAccepted(checked === true)}
              className="mt-0.5 border-white/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <Label htmlFor="terms" className="text-sm text-white/80 leading-relaxed cursor-pointer">
              I am at least 18 years old and accept the{' '}
              <Link href="/terms">
                <span className="text-primary hover:underline">Terms of Service</span>
              </Link>{' '}
              and{' '}
              <Link href="/privacy">
                <span className="text-primary hover:underline">Privacy Policy</span>
              </Link>.
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full min-h-[52px] text-base font-semibold transition-all active:scale-[0.98] rounded-xl"
            disabled={!termsAccepted || updateComplianceMutation.isPending}
          >
            Continue to SameVibe
          </Button>
        </form>
      </div>
    </div>
  );
}
