import { ProcessingService } from '../services/ProcessingService.js';

// Test data
const validOrder = {
  orderId: "ORD-2024-001234",
  customerId: "CUST-789456",
  customerEmail: "john.smith@example.com",
  customerType: "new",
  promoCode: "SAVE10",
  items: [
    {
      productId: "LAPTOP-MACBOOK-14",
      quantity: 1,
      price: 599.99,
      category: "electronics"
    },
    {
      productId: "MOUSE-LOGITECH-MX3",
      quantity: 2,
      price: 79.99,
      category: "accessories"
    }
  ],
  shippingAddress: {
    firstName: "John",
    lastName: "Smith",
    street: "123 Main Street, Apt 4B",
    city: "New York",
    state: "NY",
    postalCode: "10001",
    country: "USA",
    phone: "+1-555-0123-4567"
  },
  paymentMethod: "credit_card"
};

const invalidOrder = {
  orderId: "",
  customerEmail: "invalid-email",
  items: [],
  shippingAddress: {
    firstName: "John"
  }
};

async function testProcessingService() {
  const processor = new ProcessingService();

  console.log("=== Testing ProcessingService ===\n");

  //Order Validation (Valid Order)
  console.log("1. Testing Order Validation (Valid Order):");
  const validationResult = await processor.orderValidation(validOrder);
  console.log("Result:", JSON.stringify(validationResult, null, 2));
  console.log("Valid order should pass:", validationResult.isValid);
  console.log();

  //Order Validation (Invalid Order)
  console.log("2. Testing Order Validation (Invalid Order):");
  const invalidValidationResult = await processor.orderValidation(invalidOrder);
  console.log("Result:", JSON.stringify(invalidValidationResult, null, 2));
  console.log("Invalid order should fail:", !invalidValidationResult.isValid);
  console.log();

  //Pricing & Discounts
  console.log("3. Testing Pricing & Discounts:");
  const pricingResult = await processor.pricingDiscounts(validOrder);
  console.log("Result:", JSON.stringify(pricingResult, null, 2));
  console.log("Total calculated:", pricingResult.total);
  console.log("Applied rules:", pricingResult.appliedRules.join(", "));
  console.log();

  //Customer Notification
  console.log("4. Testing Customer Notification:");
  const notificationResult = await processor.customerNotification({
    ...validOrder,
    orderTotal: pricingResult.total
  });
  console.log("Result:", JSON.stringify(notificationResult, null, 2));
  console.log("Email sent to:", notificationResult.email);
  console.log("Delivery date:", notificationResult.messageData?.estimatedDelivery);
  console.log();

  //Complete Flow
  console.log("5. Testing Complete Flow:");
  console.log("Step 1: Validation");
  const validation = await processor.orderValidation(validOrder);
  
  if (validation.isValid) {
    console.log("Order is valid");
    
    console.log("Step 2: Pricing");
    const pricing = await processor.pricingDiscounts(validOrder);
    console.log(`Total: $${pricing.total}`);
    
    console.log("Step 3: Notification");
    const notification = await processor.customerNotification({
      ...validOrder,
      orderTotal: pricing.total
    });
    console.log(`Notification sent: ${notification.notificationSent}`);
    
    console.log("Complete flow successful!");
  } else {
    console.log("Order validation failed");
  }
}

// Run tests
testProcessingService().catch(console.error);