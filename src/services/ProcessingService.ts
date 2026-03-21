export interface ValidationResult {
  isValid: boolean;
  checks: {
    productsAvailable: boolean;
    emailValid: boolean;
    addressComplete: boolean;
    paymentMethodValid: boolean;
  };
  issues: string[];
  enrichedData?: {
    subtotal: number;
    estimatedTax: number;
    estimatedShipping: number;
    estimatedTotal: number;
  };
}

export interface PricingResult {
  subtotal: number;
  discounts: {
    newCustomerDiscount: number;
    bulkDiscount: number;
    promoCodeDiscount: number;
  };
  tax: {
    rate: number;
    amount: number;
  };
  shipping: {
    method: string;
    cost: number;
    freeShippingApplied: boolean;
  };
  total: number;
  appliedRules: string[];
}

export interface NotificationResult {
  notificationSent: boolean;
  email: string;
  messageType: string;
  sentAt: string;
  messageData?: any;
}

export class ProcessingService {
  
  //Order Validation
  async orderValidation(payload: any): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      checks: {
        productsAvailable: true,
        emailValid: true,
        addressComplete: true,
        paymentMethodValid: true
      },
      issues: []
    };

    try {
      if (!payload.orderId) {
        result.issues.push("Missing orderId");
        result.isValid = false;
      }

      if (!payload.customerEmail) {
        result.issues.push("Missing customerEmail");
        result.isValid = false;
        result.checks.emailValid = false;
      }

      if (payload.customerEmail && !this.isValidEmail(payload.customerEmail)) {
        result.issues.push("Invalid email format");
        result.isValid = false;
        result.checks.emailValid = false;
      }

      if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
        result.issues.push("No items in order");
        result.isValid = false;
        result.checks.productsAvailable = false;
      }

      if (!payload.shippingAddress) {
        result.issues.push("Missing shipping address");
        result.isValid = false;
        result.checks.addressComplete = false;
      } else {
        const address = payload.shippingAddress;
        if (!address.firstName || !address.street || !address.city || !address.country) {
          result.issues.push("Incomplete shipping address");
          result.isValid = false;
          result.checks.addressComplete = false;
        }
      }

      if (result.isValid && payload.items) {
        const subtotal = payload.items.reduce((sum: number, item: any) => 
          sum + (item.price * item.quantity), 0
        );
        
        result.enrichedData = {
          subtotal,
          estimatedTax: subtotal * 0.16,
          estimatedShipping: subtotal > 100 ? 0 : 10,
          estimatedTotal: subtotal + (subtotal * 0.16) + (subtotal > 100 ? 0 : 10)
        };
      }

      return result;

    } catch (error) {
      result.issues.push("Validation processing error");
      result.isValid = false;
      return result;
    }
  }

  //Pricing & Discounts
  async pricingDiscounts(payload: any): Promise<PricingResult> {
    const result: PricingResult = {
      subtotal: 0,
      discounts: {
        newCustomerDiscount: 0,
        bulkDiscount: 0,
        promoCodeDiscount: 0
      },
      tax: {
        rate: 0.16,
        amount: 0
      },
      shipping: {
        method: "standard",
        cost: 10,
        freeShippingApplied: false
      },
      total: 0,
      appliedRules: []
    };

    try {
      if (payload.items && Array.isArray(payload.items)) {
        result.subtotal = payload.items.reduce((sum: number, item: any) => 
          sum + (item.price * item.quantity), 0
        );
      }

      let totalDiscount = 0;

      if (payload.customerType === "new") {
        result.discounts.newCustomerDiscount = result.subtotal * 0.10;
        totalDiscount += result.discounts.newCustomerDiscount;
        result.appliedRules.push("new_customer_10percent");
      }

      if (result.subtotal > 500) {
        result.discounts.bulkDiscount = result.subtotal * 0.15;
        totalDiscount += result.discounts.bulkDiscount;
        result.appliedRules.push("bulk_discount_15percent");
      }

      if (payload.promoCode === "SAVE10") {
        result.discounts.promoCodeDiscount = result.subtotal * 0.10;
        totalDiscount += result.discounts.promoCodeDiscount;
        result.appliedRules.push("promo_10percent");
      }

      const discountedSubtotal = result.subtotal - totalDiscount;
      result.tax.amount = discountedSubtotal * result.tax.rate;

      if (discountedSubtotal > 100) {
        result.shipping.cost = 0;
        result.shipping.freeShippingApplied = true;
        result.appliedRules.push("free_shipping_over_100");
      }

      result.total = discountedSubtotal + result.tax.amount + result.shipping.cost;

      return result;

    } catch (error) {
      throw new Error("Pricing calculation failed");
    }
  }

  // Customer Notification
  async customerNotification(payload: any): Promise<NotificationResult> {
    const result: NotificationResult = {
      notificationSent: true,
      email: payload.customerEmail || "",
      messageType: "order_confirmation",
      sentAt: new Date().toISOString(),
      messageData: {}
    };

    try {
      if (!payload.customerEmail) {
        result.notificationSent = false;
        return result;
      }

      result.messageData = {
        orderId: payload.orderId,
        customerName: payload.shippingAddress?.firstName || "Customer",
        orderTotal: payload.orderTotal || 0,
        itemCount: payload.items?.length || 0,
        estimatedDelivery: this.calculateEstimatedDelivery(),
        orderDate: new Date().toISOString()
      };

      console.log(`Email sent to ${result.email}: Order ${payload.orderId} confirmed`);

      return result;

    } catch (error) {
      result.notificationSent = false;
      return result;
    }
  }

  // Helper methods
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private calculateEstimatedDelivery(): string {
    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 5); // 5 days from now
    return deliveryDate.toISOString().split('T')[0] || '';
  }
}