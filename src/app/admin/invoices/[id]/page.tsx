"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { brand, contact, currency, invoiceConfig, formatCurrency } from "@/config/site";

interface Invoice {
  id: string;
  bookingId: string;
  invoiceNumber: string;
  status: string;
  rentalStartDate: string | null;
  rentalEndDate: string | null;
  rentalDays: number;
  dailyRate: number;
  rentalAmount: number;
  collectionOdometer: number | null;
  returnOdometer: number | null;
  totalMileage: number | null;
  freeMileage: number | null;
  extraMileage: number | null;
  extraMileageRate: number | null;
  extraMileageCost: number | null;
  packageCharges: number | null;
  fuelCharge: number | null;
  damageCharge: number | null;
  lateReturnCharge: number | null;
  otherCharges: number | null;
  otherChargesDesc: string | null;
  subtotal: number;
  discountAmount: number | null;
  discountReason: string | null;
  taxRate: number | null;
  taxAmount: number | null;
  totalAmount: number;
  advancePaid: number | null;
  balanceDue: number;
  amountPaid: number;
  issuedAt: string | null;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  termsAndConditions: string | null;
  sentViaEmail: boolean;
  emailSentAt: string | null;
  sentViaWhatsApp: boolean;
  whatsAppSentAt: string | null;
  createdAt: string;
  booking: {
    id: string;
    startDate: string;
    endDate: string;
    pickupLocation: string;
    dropoffLocation: string;
    user: {
      id: string;
      name: string | null;
      email: string | null;
      phone: string | null;
    };
    vehicle: {
      id: string;
      name: string;
      brand: string;
      model: string;
      year: number;
      images: string;
    };
    packages: {
      id: string;
      price: number;
      package: {
        id: string;
        name: string;
      };
    }[];
  };
  payments: {
    id: string;
    amount: number;
    method: string;
    reference: string | null;
    notes: string | null;
    paidAt: string;
  }[];
}

export default function InvoiceViewPage() {
  const params = useParams();
  const router = useRouter();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchInvoice();
    }
  }, [params.id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/invoices/${params.id}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch invoice");
      }
      const data = await response.json();
      setInvoice(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSendEmail = async () => {
    if (!invoice) return;
    try {
      setActionLoading("email");
      const response = await fetch(`/api/admin/invoices/${invoice.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-email" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to send email");
      }
      await fetchInvoice();
      alert("Invoice sent via email successfully!");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!invoice) return;
    try {
      setActionLoading("whatsapp");
      const response = await fetch(`/api/admin/invoices/${invoice.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send-whatsapp" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate WhatsApp link");
      }
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank");
      }
      await fetchInvoice();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to send via WhatsApp");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, string> = {
      DRAFT: "bg-slate-100 text-slate-600 ring-slate-200",
      ISSUED: "bg-blue-50 text-blue-600 ring-blue-200",
      SENT: "bg-purple-50 text-purple-600 ring-purple-200",
      PARTIALLY_PAID: "bg-amber-50 text-amber-600 ring-amber-200",
      PAID: "bg-emerald-50 text-emerald-600 ring-emerald-200",
      OVERDUE: "bg-red-50 text-red-600 ring-red-200",
      CANCELLED: "bg-slate-100 text-slate-400 ring-slate-200",
    };

    const labels: Record<string, string> = {
      DRAFT: "Draft",
      ISSUED: "Issued",
      SENT: "Sent",
      PARTIALLY_PAID: "Partial",
      PAID: "Paid",
      OVERDUE: "Overdue",
      CANCELLED: "Cancelled",
    };

    return (
      <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset ${statusConfig[status] || statusConfig.DRAFT}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="rounded-2xl bg-red-50 border border-red-200 p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-red-700 mb-2">Invoice Not Found</h2>
          <p className="text-red-600 mb-4">{error || "The requested invoice could not be found."}</p>
          <Link href="/admin/bookings" className="text-blue-600 hover:underline">
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
          .no-print {
            display: none !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>

      <div className="space-y-6">
        {/* Header Actions - No Print */}
        <div className="no-print flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Invoice {invoice.invoiceNumber}</h1>
              <p className="text-slate-500 text-sm">
                Created on {formatDateTime(invoice.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            <button
              onClick={handleSendEmail}
              disabled={actionLoading === "email"}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {actionLoading === "email" ? "Sending..." : "Email"}
            </button>
            <button
              onClick={handleSendWhatsApp}
              disabled={actionLoading === "whatsapp"}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {actionLoading === "whatsapp" ? "Opening..." : "WhatsApp"}
            </button>
          </div>
        </div>

        {/* Status and Sending Info - No Print */}
        <div className="no-print rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-slate-500 text-sm">Status:</span>
              {getStatusBadge(invoice.status)}
            </div>
            <div className="flex items-center gap-6 text-sm">
              {invoice.sentViaEmail && (
                <div className="flex items-center gap-1 text-emerald-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span>Emailed {formatDateTime(invoice.emailSentAt)}</span>
                </div>
              )}
              {invoice.sentViaWhatsApp && (
                <div className="flex items-center gap-1 text-emerald-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>WhatsApp {formatDateTime(invoice.whatsAppSentAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Printable Invoice */}
        <div className="print-area rounded-2xl bg-white shadow-sm ring-1 ring-slate-200/60 overflow-hidden">
          {/* Invoice Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold">{brand.name}</h1>
                <p className="text-blue-100 mt-1">{brand.tagline}</p>
              </div>
              <div className="text-right">
                <h2 className="text-2xl font-bold">INVOICE</h2>
                <p className="text-blue-100 font-mono text-lg">{invoice.invoiceNumber}</p>
              </div>
            </div>
          </div>

          {/* Invoice Body */}
          <div className="p-8">
            {/* Billing Info */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">From</h3>
                <div className="text-slate-700">
                  <p className="font-semibold text-slate-900">{invoiceConfig.companyDetails.name}</p>
                  <p>{invoiceConfig.companyDetails.address}</p>
                  <p>{invoiceConfig.companyDetails.phone}</p>
                  <p>{invoiceConfig.companyDetails.email}</p>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Bill To</h3>
                <div className="text-slate-700">
                  <p className="font-semibold text-slate-900">{invoice.booking.user.name || "N/A"}</p>
                  <p>{invoice.booking.user.email}</p>
                  {invoice.booking.user.phone && <p>{invoice.booking.user.phone}</p>}
                </div>
              </div>
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-4 gap-4 mb-8 p-4 bg-slate-50 rounded-xl">
              <div>
                <p className="text-xs text-slate-500 uppercase">Invoice Date</p>
                <p className="font-medium">{formatDate(invoice.issuedAt || invoice.createdAt)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Due Date</p>
                <p className="font-medium">{formatDate(invoice.dueDate)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Status</p>
                <p className="font-medium capitalize">{invoice.status.toLowerCase().replace("_", " ")}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase">Booking ID</p>
                <p className="font-medium font-mono text-sm">{invoice.bookingId.slice(-8).toUpperCase()}</p>
              </div>
            </div>

            {/* Vehicle Info */}
            <div className="mb-8 p-4 border rounded-xl">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Vehicle & Rental Period</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-semibold text-slate-900">{invoice.booking.vehicle.name}</p>
                  <p className="text-sm text-slate-600">
                    {invoice.booking.vehicle.brand} {invoice.booking.vehicle.model} ({invoice.booking.vehicle.year})
                  </p>
                </div>
                <div className="text-sm text-slate-600">
                  <p>
                    <span className="font-medium">Actual Rental:</span> {formatDate(invoice.rentalStartDate)} - {formatDate(invoice.rentalEndDate)}
                    <span className="text-slate-500 ml-1">({invoice.rentalDays} days)</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Original Booking: {formatDate(invoice.booking.startDate)} - {formatDate(invoice.booking.endDate)}
                  </p>
                  <p className="mt-1">
                    {invoice.booking.pickupLocation} → {invoice.booking.dropoffLocation}
                  </p>
                </div>
              </div>
            </div>

            {/* Line Items */}
            <table className="w-full mb-8">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 text-xs font-semibold text-slate-500 uppercase">Description</th>
                  <th className="text-right py-3 text-xs font-semibold text-slate-500 uppercase">Qty/Days</th>
                  <th className="text-right py-3 text-xs font-semibold text-slate-500 uppercase">Rate</th>
                  <th className="text-right py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody>
                {/* Rental */}
                <tr className="border-b border-slate-100">
                  <td className="py-3">
                    <p className="font-medium">Vehicle Rental</p>
                    <p className="text-sm text-slate-500">{invoice.booking.vehicle.name}</p>
                  </td>
                  <td className="text-right py-3">{invoice.rentalDays} days</td>
                  <td className="text-right py-3">{formatCurrency(invoice.dailyRate)}/day</td>
                  <td className="text-right py-3 font-medium">{formatCurrency(invoice.rentalAmount)}</td>
                </tr>

                {/* Packages */}
                {invoice.booking.packages && invoice.booking.packages.length > 0 && (
                  <>
                    {invoice.booking.packages.map((pkg) => (
                      <tr key={pkg.id} className="border-b border-slate-100">
                        <td className="py-3">
                          <p className="font-medium">Package: {pkg.package.name}</p>
                        </td>
                        <td className="text-right py-3">1</td>
                        <td className="text-right py-3">{formatCurrency(pkg.price)}</td>
                        <td className="text-right py-3 font-medium">{formatCurrency(pkg.price)}</td>
                      </tr>
                    ))}
                  </>
                )}

                {/* Extra Mileage */}
                {invoice.extraMileage && invoice.extraMileage > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="py-3">
                      <p className="font-medium">Extra Mileage Charge</p>
                      <p className="text-sm text-slate-500">
                        {invoice.extraMileage} km beyond {invoice.freeMileage} km free
                      </p>
                    </td>
                    <td className="text-right py-3">{invoice.extraMileage} km</td>
                    <td className="text-right py-3">{formatCurrency(invoice.extraMileageRate || 0)}/km</td>
                    <td className="text-right py-3 font-medium">{formatCurrency(invoice.extraMileageCost || 0)}</td>
                  </tr>
                )}

                {/* Fuel Charge */}
                {invoice.fuelCharge && invoice.fuelCharge > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="py-3"><p className="font-medium">Fuel Charge</p></td>
                    <td className="text-right py-3">1</td>
                    <td className="text-right py-3">{formatCurrency(invoice.fuelCharge)}</td>
                    <td className="text-right py-3 font-medium">{formatCurrency(invoice.fuelCharge)}</td>
                  </tr>
                )}

                {/* Damage Charge */}
                {invoice.damageCharge && invoice.damageCharge > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="py-3"><p className="font-medium">Damage Charge</p></td>
                    <td className="text-right py-3">1</td>
                    <td className="text-right py-3">{formatCurrency(invoice.damageCharge)}</td>
                    <td className="text-right py-3 font-medium">{formatCurrency(invoice.damageCharge)}</td>
                  </tr>
                )}

                {/* Late Return Charge */}
                {invoice.lateReturnCharge && invoice.lateReturnCharge > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="py-3"><p className="font-medium">Late Return Charge</p></td>
                    <td className="text-right py-3">1</td>
                    <td className="text-right py-3">{formatCurrency(invoice.lateReturnCharge)}</td>
                    <td className="text-right py-3 font-medium">{formatCurrency(invoice.lateReturnCharge)}</td>
                  </tr>
                )}

                {/* Other Charges */}
                {invoice.otherCharges && invoice.otherCharges > 0 && (
                  <tr className="border-b border-slate-100">
                    <td className="py-3">
                      <p className="font-medium">Other Charges</p>
                      {invoice.otherChargesDesc && <p className="text-sm text-slate-500">{invoice.otherChargesDesc}</p>}
                    </td>
                    <td className="text-right py-3">1</td>
                    <td className="text-right py-3">{formatCurrency(invoice.otherCharges)}</td>
                    <td className="text-right py-3 font-medium">{formatCurrency(invoice.otherCharges)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-80">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-600">Subtotal</span>
                  <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discountAmount && invoice.discountAmount > 0 && (
                  <div className="flex justify-between py-2 border-b text-emerald-600">
                    <span>
                      Discount
                      {invoice.discountReason && <span className="text-xs ml-1">({invoice.discountReason})</span>}
                    </span>
                    <span>-{formatCurrency(invoice.discountAmount)}</span>
                  </div>
                )}
                {invoice.taxAmount && invoice.taxAmount > 0 && (
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-600">{invoiceConfig.taxName} ({invoice.taxRate}%)</span>
                    <span>{formatCurrency(invoice.taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 text-lg font-bold border-b-2 border-slate-300">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.totalAmount)}</span>
                </div>
                {invoice.advancePaid && invoice.advancePaid > 0 && (
                  <div className="flex justify-between py-2 text-emerald-600">
                    <span>Advance Paid</span>
                    <span>-{formatCurrency(invoice.advancePaid)}</span>
                  </div>
                )}
                {invoice.amountPaid > 0 && invoice.amountPaid !== invoice.advancePaid && (
                  <div className="flex justify-between py-2 text-emerald-600">
                    <span>Amount Paid</span>
                    <span>-{formatCurrency(invoice.amountPaid)}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 text-xl font-bold bg-blue-50 px-3 rounded-xl mt-2">
                  <span className="text-blue-800">Balance Due</span>
                  <span className="text-blue-800">{formatCurrency(invoice.balanceDue)}</span>
                </div>
              </div>
            </div>

            {/* Mileage Summary */}
            {invoice.totalMileage && invoice.totalMileage > 0 && (
              <div className="mb-8 p-4 bg-slate-50 rounded-xl">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Mileage Summary</h3>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Collection Odometer</p>
                    <p className="font-medium">{invoice.collectionOdometer?.toLocaleString()} km</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Return Odometer</p>
                    <p className="font-medium">{invoice.returnOdometer?.toLocaleString()} km</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total Mileage</p>
                    <p className="font-medium">{invoice.totalMileage?.toLocaleString()} km</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Free Mileage</p>
                    <p className="font-medium">{invoice.freeMileage?.toLocaleString()} km</p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment History */}
            {invoice.payments && invoice.payments.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Payment History</h3>
                <div className="border rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-slate-500">Date</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-slate-500">Method</th>
                        <th className="text-left py-2 px-4 text-xs font-semibold text-slate-500">Reference</th>
                        <th className="text-right py-2 px-4 text-xs font-semibold text-slate-500">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.payments.map((payment) => (
                        <tr key={payment.id} className="border-t">
                          <td className="py-2 px-4 text-sm">{formatDateTime(payment.paidAt)}</td>
                          <td className="py-2 px-4 text-sm capitalize">{payment.method.toLowerCase()}</td>
                          <td className="py-2 px-4 text-sm font-mono">{payment.reference || "-"}</td>
                          <td className="py-2 px-4 text-sm font-medium text-right text-emerald-600">
                            +{formatCurrency(payment.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Notes */}
            {invoice.notes && (
              <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Notes</h3>
                <p className="text-sm text-amber-800 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}

            {/* Terms */}
            <div className="border-t pt-6">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Terms & Conditions
              </h3>
              <p className="text-xs text-slate-500 whitespace-pre-wrap">
                {invoice.termsAndConditions || invoiceConfig.defaultTerms}
              </p>
            </div>

            {/* Bank Details */}
            {invoiceConfig.bankDetails.bankName && (
              <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Bank Details for Payment
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Bank Name</p>
                    <p className="font-medium">{invoiceConfig.bankDetails.bankName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Account Name</p>
                    <p className="font-medium">{invoiceConfig.bankDetails.accountName}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Account Number</p>
                    <p className="font-medium font-mono">{invoiceConfig.bankDetails.accountNumber}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Branch Code</p>
                    <p className="font-medium">{invoiceConfig.bankDetails.branchCode}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t text-center text-sm text-slate-500">
              <p>Thank you for your business!</p>
              <p className="mt-2">
                {contact.address.full} | {contact.phone.main} | {contact.email.general}
              </p>
            </div>
          </div>
        </div>

        {/* Back Link - No Print */}
        <div className="no-print text-center">
          <Link
            href="/admin/invoices"
            className="text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Invoices
          </Link>
        </div>
      </div>
    </>
  );
}
