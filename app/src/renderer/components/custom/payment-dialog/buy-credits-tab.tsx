/**
 * Buy Credits Tab Component
 */

import { useCallback, useState } from 'react';

import Loading from '@/components/custom/loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePayment } from '@/hooks/use-payment';
import { CREDITS_PER_MINUTE } from '@/lib/consts';
import { cn } from '@/lib/utils';
import type { AvailableCurrency, CreditPlanInfo } from '@/types/payment';

interface BuyCreditsTabProps {
  credits: number;
  onPaymentCreated: (paymentId: string) => void;
}

export default function BuyCreditsTab({ credits, onPaymentCreated }: BuyCreditsTabProps) {
  const { plans, currencies, loading, error, createPayment } = usePayment();
  const [selectedPlan, setSelectedPlan] = useState<CreditPlanInfo | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [creating, setCreating] = useState(false);

  const availableMinutes = Math.floor(credits / CREDITS_PER_MINUTE);

  const handleSelectPlan = useCallback((plan: CreditPlanInfo) => {
    setSelectedPlan(plan);
  }, []);

  const handleCreatePayment = useCallback(async () => {
    if (!selectedPlan) return;

    setCreating(true);
    try {
      const payment = await createPayment({
        plan: selectedPlan.plan,
        pay_currency: selectedCurrency || undefined,
      });

      if (payment) {
        onPaymentCreated(payment.payment_id);
      }
    } catch (err) {
      console.error('Failed to create payment:', err);
    } finally {
      setCreating(false);
    }
  }, [selectedPlan, selectedCurrency, createPayment, onPaymentCreated]);

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 p-4 rounded-lg">
        <div className="text-sm font-medium">Current Balance</div>
        <div className="text-2xl font-bold">{credits.toLocaleString()} credits</div>
        <div className="text-sm text-muted-foreground">
          Available for ~{availableMinutes} minute{availableMinutes !== 1 ? 's' : ''} (10 credits
          per minute)
        </div>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {loading && plans.length === 0 ? (
        <div className="py-8">
          <Loading disclaimer="Loading payment plans…" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-1">
            {plans.map((plan) => (
              <Card
                key={plan.plan}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-lg',
                  selectedPlan?.plan === plan.plan && 'ring-2 ring-primary'
                )}
                onClick={() => handleSelectPlan(plan)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {plan.credits.toLocaleString()} Credits
                    {plan.popular && (
                      <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                        Popular
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription>${plan.priceUsd} USD</CardDescription>
                </CardHeader>
                <CardContent>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {selectedPlan && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
                <CardDescription>
                  Complete your purchase of {selectedPlan.credits.toLocaleString()} credits for $
                  {selectedPlan.priceUsd} USD
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Payment Currency (Optional)
                  </label>
                  <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Auto-select best currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="#">Auto-select</SelectItem>
                      {currencies.map((currency: AvailableCurrency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          <div className="flex items-center gap-2">
                            <img src={currency.logo_url} alt={currency.name} className="w-4 h-4" />
                            <span>
                              {currency.name} ({currency.code.toUpperCase()})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full" onClick={handleCreatePayment} disabled={creating}>
                  {creating ? 'Creating Payment...' : 'Create Payment'}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
