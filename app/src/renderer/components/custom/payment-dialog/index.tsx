/**
 * Payment Dialog
 * Unified dialog for payment management with tabs for plans, history, and status
 */

import { CreditCard, History, Receipt } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppState } from '@/hooks/use-app-state';
import { usePayment } from '@/hooks/use-payment';

import BuyCreditsTab from './buy-credits-tab';
import PaymentHistoryTab from './payment-history-tab';
import PaymentStatusTab from './payment-status-tab';

interface PaymentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'buy' | 'history' | 'status';
}

export default function PaymentDialog({
  isOpen,
  onOpenChange,
  defaultTab = 'buy',
}: PaymentDialogProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [statusPaymentId, setStatusPaymentId] = useState('');
  const { appState } = useAppState();
  const { getCurrencies } = usePayment();

  useEffect(() => {
    if (isOpen) {
      getCurrencies();
    }
  }, [isOpen, getCurrencies]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const handlePaymentCreated = (paymentId: string) => {
    setStatusPaymentId(paymentId);
    setActiveTab('status');
  };

  const handleViewPayment = (paymentId: string) => {
    setStatusPaymentId(paymentId);
    setActiveTab('status');
  };

  const handleSwitchToBuy = () => {
    setActiveTab('buy');
  };

  const remainingCredits = appState?.credits ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-5xl max-h-[90vh] overflow-auto flex flex-col">
        <DialogHeader>
          <DialogTitle>Payment Management</DialogTitle>
          <DialogDescription>
            Manage your credits, view payment history, and check payment status
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as 'buy' | 'history' | 'status')}
          className="flex-1 flex flex-col"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="buy" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span>Buy Credits</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span>History</span>
            </TabsTrigger>
            <TabsTrigger value="status" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span>Status</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buy" className="flex-1 overflow-auto mt-4">
            <BuyCreditsTab credits={remainingCredits} onPaymentCreated={handlePaymentCreated} />
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-auto mt-4">
            <PaymentHistoryTab
              isActive={activeTab === 'history'}
              onViewPayment={handleViewPayment}
              onSwitchToBuy={handleSwitchToBuy}
            />
          </TabsContent>

          <TabsContent value="status" className="flex-1 overflow-auto mt-4">
            <PaymentStatusTab key={statusPaymentId} initialPaymentId={statusPaymentId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
