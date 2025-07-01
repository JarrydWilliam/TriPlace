import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/");
    } else if (!authLoading && user) {
      navigate("/onboarding-swipe");
    }
  }, [user, authLoading, navigate]);

  return null;
}
