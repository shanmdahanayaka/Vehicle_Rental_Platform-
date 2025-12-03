"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { brand, contact, formatCurrency } from "@/config/site";

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
    documents: {
      id: string;
      type: string;
      title: string;
      fileUrl: string;
      stage: string;
      createdAt: string;
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

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/login");
    }
  }, [sessionStatus, router]);

  useEffect(() => {
    if (params.id && session?.user) {
      fetchInvoice();
    }
  }, [params.id, session]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/invoices/${params.id}`);
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, string> = {
      DRAFT: "bg-slate-100 text-slate-600",
      ISSUED: "bg-blue-100 text-blue-600",
      SENT: "bg-purple-100 text-purple-600",
      PARTIALLY_PAID: "bg-amber-100 text-amber-600",
      PAID: "bg-emerald-100 text-emerald-600",
      OVERDUE: "bg-red-100 text-red-600",
      CANCELLED: "bg-slate-100 text-slate-400",
    };
    return statusConfig[status] || "bg-slate-100 text-slate-600";
  };

  const getVehicleImage = (images: string) => {
    try {
      const parsed = JSON.parse(images);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
    } catch {
      return images?.startsWith("http") ? images : null;
    }
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Error Loading Invoice</h3>
          <p className="text-slate-500 mb-4">{error}</p>
          <Link href="/invoices" className="text-blue-600 hover:underline">
            Back to Invoices
          </Link>
        </div>
      </div>
    );
  }

  if (!invoice) return null;

  const vehicleImage = getVehicleImage(invoice.booking.vehicle.images);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header - Hidden on Print */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white print:hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/invoices"
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-xl font-bold">{invoice.invoiceNumber}</h1>
                <p className="text-white/80 text-sm">Invoice Details</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print / Download
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 print:py-0 print:px-0 print:max-w-none">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden print:shadow-none print:rounded-none">
          {/* Invoice Header */}
          <div className="p-8 border-b border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{brand.name}</h2>
                <div className="mt-2 text-sm text-slate-600 space-y-0.5">
                  <p>{typeof contact.address === 'object' ? contact.address.full : contact.address}</p>
                  <p>Phone: {typeof contact.phone === 'object' ? contact.phone.main : contact.phone}</p>
                  <p>Email: {typeof contact.email === 'object' ? contact.email.general : contact.email}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="inline-block">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(invoice.status)}`}>
                    {invoice.status.replace("_", " ")}
                  </span>
                </div>
                <div className="mt-4 text-sm text-slate-600">
                  <p><span className="font-medium">Invoice #:</span> {invoice.invoiceNumber}</p>
                  <p><span className="font-medium">Date:</span> {formatDate(invoice.issuedAt || invoice.createdAt)}</p>
                  {invoice.dueDate && (
                    <p><span className="font-medium">Due Date:</span> {formatDate(invoice.dueDate)}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Vehicle Info */}
          <div className="p-8 bg-slate-50 grid grid-cols-2 gap-8">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Bill To</h3>
              <p className="font-semibold text-slate-900">{invoice.booking.user.name || "Customer"}</p>
              <p className="text-sm text-slate-600">{invoice.booking.user.email}</p>
              {invoice.booking.user.phone && (
                <p className="text-sm text-slate-600">{invoice.booking.user.phone}</p>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Vehicle</h3>
              <div className="flex items-center gap-3">
                {vehicleImage && (
                  <img src={vehicleImage} alt="" className="w-16 h-12 object-cover rounded-lg" />
                )}
                <div>
                  <p className="font-semibold text-slate-900">{invoice.booking.vehicle.name}</p>
                  <p className="text-sm text-slate-600">
                    {invoice.booking.vehicle.brand} {invoice.booking.vehicle.model} ({invoice.booking.vehicle.year})
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Rental Period */}
          <div className="p-8 border-b border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Rental Period</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-blue-600 font-medium">Pickup</p>
                <p className="text-slate-900 font-semibold">{formatDate(invoice.rentalStartDate)}</p>
                <p className="text-slate-500">{invoice.booking.pickupLocation}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-purple-600 font-medium">Return</p>
                <p className="text-slate-900 font-semibold">{formatDate(invoice.rentalEndDate)}</p>
                <p className="text-slate-500">{invoice.booking.dropoffLocation}</p>
              </div>
            </div>
          </div>

          {/* Charges Table */}
          <div className="p-8">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Charges</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 font-semibold text-slate-600">Description</th>
                  <th className="text-right py-3 font-semibold text-slate-600">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {/* Base Rental */}
                <tr>
                  <td className="py-3">
                    <span className="text-slate-900">Base Rental</span>
                    <span className="text-slate-500 ml-2">({invoice.rentalDays} days × {formatCurrency(invoice.dailyRate)})</span>
                  </td>
                  <td className="py-3 text-right text-slate-900">{formatCurrency(invoice.rentalAmount)}</td>
                </tr>

                {/* Packages */}
                {invoice.booking.packages.map((pkg) => (
                  <tr key={pkg.id}>
                    <td className="py-3 text-slate-900">{pkg.package.name}</td>
                    <td className="py-3 text-right text-slate-900">{formatCurrency(pkg.price)}</td>
                  </tr>
                ))}

                {/* Extra Mileage */}
                {invoice.extraMileageCost && invoice.extraMileageCost > 0 && (
                  <tr>
                    <td className="py-3">
                      <span className="text-slate-900">Extra Mileage</span>
                      <span className="text-slate-500 ml-2">
                        ({invoice.extraMileage} km × {formatCurrency(invoice.extraMileageRate || 0)})
                      </span>
                    </td>
                    <td className="py-3 text-right text-slate-900">{formatCurrency(invoice.extraMileageCost)}</td>
                  </tr>
                )}

                {/* Fuel Charge */}
                {invoice.fuelCharge && invoice.fuelCharge > 0 && (
                  <tr>
                    <td className="py-3 text-slate-900">Fuel Charge</td>
                    <td className="py-3 text-right text-slate-900">{formatCurrency(invoice.fuelCharge)}</td>
                  </tr>
                )}

                {/* Damage Charge */}
                {invoice.damageCharge && invoice.damageCharge > 0 && (
                  <tr>
                    <td className="py-3 text-slate-900">Damage Charge</td>
                    <td className="py-3 text-right text-slate-900">{formatCurrency(invoice.damageCharge)}</td>
                  </tr>
                )}

                {/* Late Return */}
                {invoice.lateReturnCharge && invoice.lateReturnCharge > 0 && (
                  <tr>
                    <td className="py-3 text-slate-900">Late Return Charge</td>
                    <td className="py-3 text-right text-slate-900">{formatCurrency(invoice.lateReturnCharge)}</td>
                  </tr>
                )}

                {/* Other Charges */}
                {invoice.otherCharges && invoice.otherCharges > 0 && (
                  <tr>
                    <td className="py-3">
                      <span className="text-slate-900">Other Charges</span>
                      {invoice.otherChargesDesc && (
                        <span className="text-slate-500 ml-2">({invoice.otherChargesDesc})</span>
                      )}
                    </td>
                    <td className="py-3 text-right text-slate-900">{formatCurrency(invoice.otherCharges)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-6 border-t border-slate-200 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="text-slate-900">{formatCurrency(invoice.subtotal)}</span>
              </div>

              {invoice.discountAmount && invoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount {invoice.discountReason && `(${invoice.discountReason})`}</span>
                  <span>-{formatCurrency(invoice.discountAmount)}</span>
                </div>
              )}

              {invoice.taxAmount && invoice.taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax ({invoice.taxRate}%)</span>
                  <span className="text-slate-900">{formatCurrency(invoice.taxAmount)}</span>
                </div>
              )}

              <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
                <span className="text-slate-900">Total</span>
                <span className="text-slate-900">{formatCurrency(invoice.totalAmount)}</span>
              </div>

              {invoice.advancePaid && invoice.advancePaid > 0 && (
                <div className="flex justify-between text-sm text-blue-600">
                  <span>Advance Paid</span>
                  <span>-{formatCurrency(invoice.advancePaid)}</span>
                </div>
              )}

              {invoice.amountPaid > 0 && invoice.amountPaid !== invoice.advancePaid && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Amount Paid</span>
                  <span>-{formatCurrency(invoice.amountPaid)}</span>
                </div>
              )}

              <div className={`flex justify-between text-lg font-bold pt-2 ${invoice.balanceDue > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                <span>Balance Due</span>
                <span>{formatCurrency(invoice.balanceDue)}</span>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {invoice.payments.length > 0 && (
            <div className="p-8 bg-slate-50 border-t border-slate-200">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Payment History</h3>
              <div className="space-y-2">
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <div>
                      <p className="font-medium text-slate-900">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-slate-500">
                        {payment.method} • {formatDate(payment.paidAt)}
                        {payment.reference && ` • Ref: ${payment.reference}`}
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Paid</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Section */}
          {invoice.booking.documents && invoice.booking.documents.length > 0 && (
            <div className="p-8 border-t border-slate-200 print:hidden">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Related Documents</h3>
              <div className="grid grid-cols-2 gap-3">
                {invoice.booking.documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-900 truncate">{doc.title}</p>
                      <p className="text-xs text-slate-500">{doc.type.replace("_", " ")} • {doc.stage}</p>
                    </div>
                    <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Terms & Notes */}
          {(invoice.notes || invoice.termsAndConditions) && (
            <div className="p-8 bg-slate-50 border-t border-slate-200 text-sm text-slate-600">
              {invoice.notes && (
                <div className="mb-4">
                  <h4 className="font-semibold text-slate-700 mb-1">Notes</h4>
                  <p>{invoice.notes}</p>
                </div>
              )}
              {invoice.termsAndConditions && (
                <div>
                  <h4 className="font-semibold text-slate-700 mb-1">Terms & Conditions</h4>
                  <p className="whitespace-pre-line">{invoice.termsAndConditions}</p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="p-8 border-t border-slate-200 text-center text-sm text-slate-500">
            <p>Thank you for choosing {brand.name}!</p>
            <p className="mt-1">For any questions, contact us at {typeof contact.email === 'object' ? contact.email.general : contact.email} or {typeof contact.phone === 'object' ? contact.phone.main : contact.phone}</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
