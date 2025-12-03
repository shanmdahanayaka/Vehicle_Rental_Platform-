"use client";

import { useState, useEffect, useRef } from "react";
import { formatCurrency, mileageConfig, fuelLevels, paymentMethods, documentTypes } from "@/config/site";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CreateBookingModal from "./CreateBookingModal";
import { getPusherClient, CHANNELS, EVENTS } from "@/lib/pusher-client";

interface Booking {
  id: string;
  userId: string;
  vehicleId: string;
  startDate: Date;
  endDate: Date;
  totalPrice: number;
  status: string;
  pickupLocation: string;
  dropoffLocation: string;
  createdAt: Date;
  // Confirmation details
  confirmedAt: Date | null;
  confirmedBy: string | null;
  advanceAmount: number | null;
  advancePaid: boolean;
  advancePaidAt: Date | null;
  advancePaymentMethod: string | null;
  confirmationNotes: string | null;
  // Collection details
  collectedAt: Date | null;
  collectedBy: string | null;
  collectionOdometer: number | null;
  collectionFuelLevel: string | null;
  collectionNotes: string | null;
  // Return details
  returnedAt: Date | null;
  returnedBy: string | null;
  returnOdometer: number | null;
  returnFuelLevel: string | null;
  returnNotes: string | null;
  // Mileage
  freeMileage: number | null;
  extraMileageRate: number | null;
  totalMileage: number | null;
  extraMileage: number | null;
  extraMileageCost: number | null;
  // Charges
  fuelCharge: number | null;
  damageCharge: number | null;
  lateReturnCharge: number | null;
  otherCharges: number | null;
  otherChargesNote: string | null;
  discountAmount: number | null;
  discountReason: string | null;
  finalAmount: number | null;
  balanceDue: number | null;
  // Package booking fields
  isPackageBooking: boolean;
  primaryPackageId: string | null;
  packageBasePrice: number | null;
  vehiclePackagePrice: number | null;
  customCostsTotal: number | null;
  primaryPackage: {
    id: string;
    name: string;
    type: string;
  } | null;
  customCosts: {
    id: string;
    name: string;
    price: number;
    packageCustomCost: {
      id: string;
      name: string;
    };
  }[];
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  vehicle: {
    id: string;
    name: string;
    brand: string;
    model: string;
    pricePerDay: number;
  };
  payment: {
    id: string;
    amount: number;
    status: string;
    method: string | null;
  } | null;
  packages: {
    id: string;
    price: number;
    package: {
      id: string;
      name: string;
      type: string;
    };
  }[];
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
    balanceDue: number;
    amountPaid: number;
  } | null;
  documents: {
    id: string;
    type: string;
    title: string;
    fileUrl: string;
    stage: string;
  }[];
}

interface BookingTableProps {
  initialBookings: Booking[];
}

type ModalType = "confirm" | "collect" | "complete" | "invoice" | "payment" | "view" | null;

type BookingTypeFilter = "all" | "regular" | "package";

export default function BookingTable({ initialBookings }: BookingTableProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [statusFilter, setStatusFilter] = useState("");
  const [bookingTypeFilter, setBookingTypeFilter] = useState<BookingTypeFilter>("all");

  // Sync bookings state when initialBookings prop changes (after router.refresh())
  useEffect(() => {
    setBookings(initialBookings);
  }, [initialBookings]);

  // Subscribe to real-time booking updates
  useEffect(() => {
    const pusher = getPusherClient();
    const channel = pusher.subscribe(CHANNELS.adminBookings);

    channel.bind(EVENTS.NEW_BOOKING, () => {
      // Refresh the page data when a new booking is created
      router.refresh();
    });

    channel.bind(EVENTS.BOOKING_UPDATED, () => {
      // Refresh the page data when a booking is updated
      router.refresh();
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(CHANNELS.adminBookings);
    };
  }, [router]);

  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Count bookings by type
  const regularCount = bookings.filter((b) => !b.isPackageBooking).length;
  const packageCount = bookings.filter((b) => b.isPackageBooking).length;

  // Form states for different modals
  const [confirmForm, setConfirmForm] = useState({
    advanceAmount: "",
    advancePaid: false,
    advancePaymentMethod: "CASH",
    confirmationNotes: "",
    freeMileage: "",
    extraMileageRate: mileageConfig.extraMileageRate.toString(),
  });

  const [collectForm, setCollectForm] = useState({
    collectionOdometer: "",
    collectionFuelLevel: "FULL",
    collectionNotes: "",
  });

  const [completeForm, setCompleteForm] = useState({
    returnOdometer: "",
    returnFuelLevel: "FULL",
    returnNotes: "",
    fuelCharge: "",
    damageCharge: "",
    lateReturnCharge: "",
    otherCharges: "",
    otherChargesNote: "",
    discountAmount: "",
    discountReason: "",
    // Editable rental dates
    actualStartDate: "",
    actualStartTime: "",
    actualEndDate: "",
    actualEndTime: "",
    // Package booking option - use flat vehicle rate (ignore days)
    useFlatVehicleRate: false,
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    method: "CASH",
    reference: "",
    notes: "",
  });

  // Document upload state
  const [uploadForm, setUploadForm] = useState({
    type: "ID_CARD",
    title: "",
    description: "",
  });
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [collectionDocuments, setCollectionDocuments] = useState<{
    id?: string;
    type: string;
    title: string;
    fileUrl: string;
    fileName: string;
  }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredBookings = bookings.filter((b) => {
    const matchesStatus = !statusFilter || b.status === statusFilter;
    const matchesSearch =
      !search ||
      b.user.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.user.email.toLowerCase().includes(search.toLowerCase()) ||
      b.vehicle.name.toLowerCase().includes(search.toLowerCase()) ||
      b.primaryPackage?.name?.toLowerCase().includes(search.toLowerCase());
    const matchesType =
      bookingTypeFilter === "all" ||
      (bookingTypeFilter === "package" && b.isPackageBooking) ||
      (bookingTypeFilter === "regular" && !b.isPackageBooking);
    return matchesStatus && matchesSearch && matchesType;
  });

  const openModal = (booking: Booking, type: ModalType) => {
    setSelectedBooking(booking);
    setModalType(type);
    setError("");

    // Reset forms
    if (type === "confirm") {
      const days = Math.ceil(
        (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      setConfirmForm({
        advanceAmount: (booking.totalPrice * 0.2).toFixed(2),
        advancePaid: false,
        advancePaymentMethod: "CASH",
        confirmationNotes: "",
        freeMileage: (days * mileageConfig.freeMileagePerDay).toString(),
        extraMileageRate: mileageConfig.extraMileageRate.toString(),
      });
    } else if (type === "collect") {
      setCollectForm({
        collectionOdometer: "",
        collectionFuelLevel: "FULL",
        collectionNotes: "",
      });
      setCollectionDocuments([]);
      setUploadForm({ type: "ID_CARD", title: "", description: "" });
    } else if (type === "complete") {
      // Initialize with collection date as start and current date as end
      const collectedDate = booking.collectedAt ? new Date(booking.collectedAt) : new Date(booking.startDate);
      const returnDate = new Date();

      setCompleteForm({
        returnOdometer: "",
        returnFuelLevel: booking.collectionFuelLevel || "FULL",
        returnNotes: "",
        fuelCharge: "",
        damageCharge: "",
        lateReturnCharge: "",
        otherCharges: "",
        otherChargesNote: "",
        discountAmount: "",
        discountReason: "",
        // Initialize editable dates
        actualStartDate: collectedDate.toISOString().split("T")[0],
        actualStartTime: collectedDate.toTimeString().slice(0, 5),
        actualEndDate: returnDate.toISOString().split("T")[0],
        actualEndTime: returnDate.toTimeString().slice(0, 5),
      });
    } else if (type === "payment" && booking.invoice) {
      setPaymentForm({
        amount: booking.invoice.balanceDue.toString(),
        method: "CASH",
        reference: "",
        notes: "",
      });
    }
  };

  const closeModal = () => {
    setSelectedBooking(null);
    setModalType(null);
    setError("");
  };

  const handleWorkflowAction = async (action: string, data: Record<string, unknown>) => {
    if (!selectedBooking) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/bookings/${selectedBooking.id}/workflow`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...data }),
      });

      const result = await res.json();

      if (res.ok) {
        // Refresh bookings
        const updatedBooking = result.booking;
        setBookings(
          bookings.map((b) =>
            b.id === selectedBooking.id
              ? { ...b, ...updatedBooking }
              : b
          )
        );
        closeModal();
      } else {
        setError(result.error || "An error occurred");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    handleWorkflowAction("confirm", {
      advanceAmount: confirmForm.advanceAmount ? parseFloat(confirmForm.advanceAmount) : null,
      advancePaid: confirmForm.advancePaid,
      advancePaymentMethod: confirmForm.advancePaid ? confirmForm.advancePaymentMethod : null,
      confirmationNotes: confirmForm.confirmationNotes || null,
      freeMileage: confirmForm.freeMileage ? parseInt(confirmForm.freeMileage) : null,
      extraMileageRate: confirmForm.extraMileageRate ? parseFloat(confirmForm.extraMileageRate) : null,
    });
  };

  const handleCollect = async () => {
    if (!collectForm.collectionOdometer) {
      setError("Odometer reading is required");
      return;
    }

    // First save the documents if any
    if (selectedBooking && collectionDocuments.length > 0) {
      for (const doc of collectionDocuments) {
        if (!doc.id) {
          // Document not yet saved to server
          await fetch(`/api/admin/bookings/${selectedBooking.id}/documents`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: doc.type,
              title: doc.title,
              fileUrl: doc.fileUrl,
              fileName: doc.fileName,
              stage: "COLLECTION",
            }),
          });
        }
      }
    }

    handleWorkflowAction("collect", collectForm);
  };

  // Handle document file upload
  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedBooking) return;

    setUploadingDoc(true);

    try {
      // Upload file to server
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "documents");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      const { url } = await uploadRes.json();

      // Get document type label
      const typeLabel = documentTypes.find(d => d.value === uploadForm.type)?.label || uploadForm.type;
      const title = uploadForm.title || typeLabel;

      // Add to local documents list
      setCollectionDocuments([
        ...collectionDocuments,
        {
          type: uploadForm.type,
          title,
          fileUrl: url,
          fileName: file.name,
        },
      ]);

      // Reset form
      setUploadForm({ ...uploadForm, title: "", description: "" });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch {
      setError("Failed to upload document");
    } finally {
      setUploadingDoc(false);
    }
  };

  // Remove document from list
  const handleRemoveDocument = (index: number) => {
    setCollectionDocuments(collectionDocuments.filter((_, i) => i !== index));
  };

  const handleComplete = () => {
    if (!completeForm.returnOdometer) {
      setError("Return odometer reading is required");
      return;
    }
    handleWorkflowAction("complete", completeForm);
  };

  const handleGenerateInvoice = () => {
    handleWorkflowAction("generate-invoice", {});
  };

  const handleRecordPayment = () => {
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      setError("Valid payment amount is required");
      return;
    }
    handleWorkflowAction("record-payment", paymentForm);
  };

  const handleCancel = () => {
    if (confirm("Are you sure you want to cancel this booking?")) {
      handleWorkflowAction("cancel", {});
    }
  };

  // Calculate rental days between two dates
  const calculateRentalDays = (startDate: Date, endDate: Date) => {
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
    return Math.max(1, Math.ceil(diffMs / msPerDay));
  };

  // Get actual rental period based on editable form dates
  // Uses the dates from the complete form if provided
  const getActualRentalDays = () => {
    if (!selectedBooking) return 1;

    // Use editable dates from the form if available
    if (completeForm.actualStartDate && completeForm.actualEndDate) {
      const startDate = new Date(`${completeForm.actualStartDate}T${completeForm.actualStartTime || "12:00"}:00`);
      const endDate = new Date(`${completeForm.actualEndDate}T${completeForm.actualEndTime || "12:00"}:00`);
      return calculateRentalDays(startDate, endDate);
    }

    // Fallback to collection date and current time
    const actualStartDate = selectedBooking.collectedAt || selectedBooking.startDate;
    const actualEndDate = new Date();

    return calculateRentalDays(actualStartDate, actualEndDate);
  };

  // Calculate mileage preview for complete form
  const calculateMileagePreview = () => {
    if (!selectedBooking || !completeForm.returnOdometer) return null;

    const returnOdo = parseInt(completeForm.returnOdometer);
    const collectionOdo = selectedBooking.collectionOdometer || 0;
    const totalMileage = returnOdo - collectionOdo;

    // Calculate free mileage based on ACTUAL rental days (collection to return)
    // NOT booking dates - use actual vehicle usage period
    const rentalDays = getActualRentalDays();
    const freeMileagePerDay = mileageConfig.freeMileagePerDay;
    // Calculate: actual days × free mileage per day
    const freeMileage = rentalDays * freeMileagePerDay;

    const extraMileage = Math.max(0, totalMileage - freeMileage);
    const extraRate = Number(selectedBooking.extraMileageRate) || mileageConfig.extraMileageRate;
    const extraCost = extraMileage * extraRate;

    return { totalMileage, freeMileage, extraMileage, extraCost, rentalDays, freeMileagePerDay, extraRate };
  };

  // Calculate payment summary preview for complete form
  const calculatePaymentPreview = () => {
    if (!selectedBooking) return null;

    const mileage = calculateMileagePreview();

    // Calculate rental days based on ACTUAL dates (collection to return)
    // NOT booking dates - use actual vehicle usage period
    const rentalDays = getActualRentalDays();

    // For package bookings, use the stored vehiclePackagePrice
    const dailyRate = selectedBooking.isPackageBooking && selectedBooking.vehiclePackagePrice
      ? selectedBooking.vehiclePackagePrice
      : selectedBooking.vehicle.pricePerDay;

    // For package bookings with flat rate option, don't multiply by days
    const useFlatRate = selectedBooking.isPackageBooking && completeForm.useFlatVehicleRate;
    const baseRental = useFlatRate ? dailyRate : dailyRate * rentalDays;

    // Package charges - for package bookings, use stored packageBasePrice + customCostsTotal
    const packageCharges = selectedBooking.isPackageBooking
      ? (selectedBooking.packageBasePrice || 0) + (selectedBooking.customCostsTotal || 0)
      : selectedBooking.packages?.reduce((sum, p) => sum + p.price, 0) || 0;

    // Additional charges
    const extraMileageCost = mileage?.extraCost || 0;
    const fuelCharge = completeForm.fuelCharge ? parseFloat(completeForm.fuelCharge) : 0;
    const damageCharge = completeForm.damageCharge ? parseFloat(completeForm.damageCharge) : 0;
    const lateReturnCharge = completeForm.lateReturnCharge ? parseFloat(completeForm.lateReturnCharge) : 0;
    const otherCharges = completeForm.otherCharges ? parseFloat(completeForm.otherCharges) : 0;
    const discountAmount = completeForm.discountAmount ? parseFloat(completeForm.discountAmount) : 0;

    const additionalCharges = extraMileageCost + fuelCharge + damageCharge + lateReturnCharge + otherCharges;
    const finalAmount = baseRental + packageCharges + additionalCharges - discountAmount;
    // Only deduct advance if it was actually paid (checkbox was ticked during confirmation)
    const advancePaid = selectedBooking.advancePaid ? (selectedBooking.advanceAmount || 0) : 0;
    const balanceDue = finalAmount - advancePaid;

    return {
      rentalDays,
      dailyRate,
      baseRental,
      packageCharges,
      extraMileageCost,
      fuelCharge,
      damageCharge,
      lateReturnCharge,
      otherCharges,
      additionalCharges,
      discountAmount,
      finalAmount,
      advancePaid,
      balanceDue,
      isPackageBooking: selectedBooking.isPackageBooking,
      packageBasePrice: selectedBooking.packageBasePrice || 0,
      customCostsTotal: selectedBooking.customCostsTotal || 0,
      useFlatRate,
    };
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-700 ring-yellow-600/20",
      CONFIRMED: "bg-blue-100 text-blue-700 ring-blue-600/20",
      COLLECTED: "bg-emerald-100 text-emerald-700 ring-emerald-600/20",
      COMPLETED: "bg-purple-100 text-purple-700 ring-purple-600/20",
      INVOICED: "bg-orange-100 text-orange-700 ring-orange-600/20",
      PAID: "bg-green-100 text-green-700 ring-green-600/20",
      CANCELLED: "bg-red-100 text-red-700 ring-red-600/20",
    };
    return styles[status] || styles.PENDING;
  };

  const getNextAction = (booking: Booking) => {
    switch (booking.status) {
      case "PENDING":
        return { label: "Confirm", action: "confirm", color: "blue" };
      case "CONFIRMED":
        return { label: "Collect", action: "collect", color: "emerald" };
      case "COLLECTED":
        return { label: "Complete", action: "complete", color: "purple" };
      case "COMPLETED":
        return { label: "Invoice", action: "invoice", color: "orange" };
      case "INVOICED":
        return { label: "Payment", action: "payment", color: "green" };
      default:
        return null;
    }
  };

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "PENDING").length,
    confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
    collected: bookings.filter((b) => b.status === "COLLECTED").length,
    completed: bookings.filter((b) => ["COMPLETED", "INVOICED", "PAID"].includes(b.status)).length,
    revenue: bookings
      .filter((b) => b.status === "PAID")
      .reduce((sum, b) => sum + (b.finalAmount || b.totalPrice), 0),
  };

  const mileagePreview = calculateMileagePreview();
  const paymentPreview = calculatePaymentPreview();

  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-6">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Total</p>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Confirmed</p>
          <p className="text-2xl font-bold text-blue-600">{stats.confirmed}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Collected</p>
          <p className="text-2xl font-bold text-emerald-600">{stats.collected}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="text-2xl font-bold text-purple-600">{stats.completed}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
          <p className="text-sm text-slate-500">Revenue</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.revenue)}</p>
        </div>
      </div>

      {/* Booking Type Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-xl w-fit">
        <button
          onClick={() => setBookingTypeFilter("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            bookingTypeFilter === "all"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          All Bookings ({bookings.length})
        </button>
        <button
          onClick={() => setBookingTypeFilter("regular")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            bookingTypeFilter === "regular"
              ? "bg-white text-slate-900 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Regular ({regularCount})
        </button>
        <button
          onClick={() => setBookingTypeFilter("package")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${
            bookingTypeFilter === "package"
              ? "bg-white text-purple-600 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          Package Bookings ({packageCount})
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-1">
          <div className="relative flex-1 max-w-md">
            <svg
              className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by customer, vehicle, or package..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COLLECTED">Collected</option>
            <option value="COMPLETED">Completed</option>
            <option value="INVOICED">Invoiced</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition shadow-lg shadow-blue-500/25"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Booking
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Customer
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Vehicle
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Dates
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Amount
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => {
                  const nextAction = getNextAction(booking);
                  return (
                    <tr key={booking.id} className="group hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium text-white ${
                            booking.isPackageBooking
                              ? "bg-gradient-to-br from-purple-500 to-pink-600"
                              : "bg-gradient-to-br from-blue-500 to-purple-600"
                          }`}>
                            {booking.isPackageBooking ? (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                              </svg>
                            ) : (
                              booking.user.name?.charAt(0) || "U"
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {booking.user.name || "Unknown"}
                            </p>
                            <p className="text-xs text-slate-500">{booking.user.email}</p>
                            {booking.isPackageBooking && booking.primaryPackage && (
                              <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                </svg>
                                {booking.primaryPackage.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-700">{booking.vehicle.name}</p>
                        <p className="text-xs text-slate-500">
                          {booking.vehicle.brand} {booking.vehicle.model}
                        </p>
                        {booking.isPackageBooking && booking.vehiclePackagePrice && (
                          <p className="text-xs text-purple-600 font-medium mt-0.5">
                            Package rate: {formatCurrency(booking.vehiclePackagePrice)}/day
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-700">
                          {new Date(booking.startDate).toLocaleDateString()}
                          <span className="ml-1 text-blue-600 font-medium">
                            {new Date(booking.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">
                          to {new Date(booking.endDate).toLocaleDateString()}
                          <span className="ml-1 text-blue-600 font-medium">
                            {new Date(booking.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset ${getStatusBadge(
                            booking.status
                          )}`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <p className="text-lg font-bold text-slate-900">
                          {formatCurrency(booking.finalAmount || booking.totalPrice)}
                        </p>
                        {booking.advancePaid && (
                          <p className="text-xs text-emerald-600">
                            Adv: {formatCurrency(booking.advanceAmount || 0)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          {/* View Button */}
                          <button
                            onClick={() => openModal(booking, "view")}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
                            title="View Details"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>

                          {/* Next Action Button */}
                          {nextAction && (
                            <button
                              onClick={() => openModal(booking, nextAction.action as ModalType)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white transition bg-${nextAction.color}-600 hover:bg-${nextAction.color}-700`}
                              style={{
                                backgroundColor:
                                  nextAction.color === "blue" ? "#2563eb" :
                                  nextAction.color === "emerald" ? "#059669" :
                                  nextAction.color === "purple" ? "#9333ea" :
                                  nextAction.color === "orange" ? "#ea580c" :
                                  nextAction.color === "green" ? "#16a34a" : "#2563eb"
                              }}
                            >
                              {nextAction.label}
                            </button>
                          )}

                          {/* Invoice link if exists */}
                          {booking.invoice && (
                            <Link
                              href={`/admin/invoices/${booking.invoice.id}`}
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-orange-600 transition"
                              title="View Invoice"
                            >
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="mt-4 text-slate-500">No bookings found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================== MODALS ==================== */}

      {selectedBooking && modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {modalType === "view" && "Booking Details"}
                {modalType === "confirm" && "Confirm Booking"}
                {modalType === "collect" && "Vehicle Collection"}
                {modalType === "complete" && "Complete Rental"}
                {modalType === "invoice" && "Generate Invoice"}
                {modalType === "payment" && "Record Payment"}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Booking Info Header */}
              <div className="mb-6 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-500">Customer</p>
                    <p className="font-semibold text-slate-900">{selectedBooking.user.name}</p>
                    <p className="text-xs text-slate-500">{selectedBooking.user.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">Vehicle</p>
                    <p className="font-semibold text-slate-900">{selectedBooking.vehicle.name}</p>
                    {/* Show actual dates for Complete modal, booking dates for others */}
                    {modalType === "complete" ? (
                      <>
                        <p className="text-xs text-emerald-600 font-medium">
                          {selectedBooking.collectedAt
                            ? new Date(selectedBooking.collectedAt).toLocaleString()
                            : "Collection pending"}
                          {" → "}
                          {new Date().toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-400">
                          (Booked: {new Date(selectedBooking.startDate).toLocaleDateString()} - {new Date(selectedBooking.endDate).toLocaleDateString()})
                        </p>
                      </>
                    ) : modalType === "invoice" && selectedBooking.collectedAt && selectedBooking.returnedAt ? (
                      <>
                        <p className="text-xs text-blue-600 font-medium">
                          {new Date(selectedBooking.collectedAt).toLocaleString()}
                          {" → "}
                          {new Date(selectedBooking.returnedAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-slate-400">
                          (Booked: {new Date(selectedBooking.startDate).toLocaleDateString()} - {new Date(selectedBooking.endDate).toLocaleDateString()})
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-slate-500">
                        {new Date(selectedBooking.startDate).toLocaleDateString()} - {new Date(selectedBooking.endDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* ========== VIEW MODAL ========== */}
              {modalType === "view" && (
                <div className="space-y-4">
                  {/* Status and Amount */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500 mb-1">Status</p>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${getStatusBadge(selectedBooking.status)}`}>
                        {selectedBooking.status}
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500 mb-1">Base Amount</p>
                      <p className="text-lg font-bold text-slate-900">{formatCurrency(selectedBooking.totalPrice)}</p>
                    </div>
                  </div>

                  {/* Booking Dates */}
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-500 mb-2">Booking Period</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Pickup</p>
                        <p className="font-semibold text-slate-900">
                          {new Date(selectedBooking.startDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-blue-600">
                          {new Date(selectedBooking.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Return</p>
                        <p className="font-semibold text-slate-900">
                          {new Date(selectedBooking.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-blue-600">
                          {new Date(selectedBooking.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Pickup Location</p>
                        <p className="font-medium text-slate-900">{selectedBooking.pickupLocation}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Drop-off Location</p>
                        <p className="font-medium text-slate-900">{selectedBooking.dropoffLocation}</p>
                      </div>
                    </div>
                  </div>

                  {/* Packages */}
                  {selectedBooking.packages && selectedBooking.packages.length > 0 && (
                    <div className="rounded-xl bg-indigo-50 p-4">
                      <p className="text-xs text-indigo-600 mb-2">Selected Packages</p>
                      <div className="space-y-2">
                        {selectedBooking.packages.map((pkg) => (
                          <div key={pkg.id} className="flex justify-between items-center text-sm">
                            <span className="text-slate-700">{pkg.package.name}</span>
                            <span className="font-semibold text-indigo-700">{formatCurrency(pkg.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Confirmation Details */}
                  {selectedBooking.confirmedAt && (
                    <div className="rounded-xl bg-blue-50 p-4">
                      <p className="text-xs text-blue-600 mb-2">Confirmation Details</p>
                      <div className="text-sm space-y-1">
                        <p className="text-slate-600">
                          Confirmed: {new Date(selectedBooking.confirmedAt).toLocaleString()}
                        </p>
                        {selectedBooking.freeMileage && (
                          <p className="text-slate-600">
                            Free Mileage: <span className="font-medium">{selectedBooking.freeMileage} km</span>
                          </p>
                        )}
                        {selectedBooking.extraMileageRate && (
                          <p className="text-slate-600">
                            Extra Mileage Rate: <span className="font-medium">{formatCurrency(selectedBooking.extraMileageRate)}/km</span>
                          </p>
                        )}
                        {selectedBooking.confirmationNotes && (
                          <p className="text-slate-600 mt-2 pt-2 border-t border-blue-200">
                            Notes: {selectedBooking.confirmationNotes}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Advance Payment */}
                  {selectedBooking.advancePaid && selectedBooking.advanceAmount && selectedBooking.advanceAmount > 0 && (
                    <div className="rounded-xl bg-green-50 p-4">
                      <p className="text-xs text-green-600 mb-1">Advance Payment Received</p>
                      <p className="text-lg font-bold text-green-700">
                        {formatCurrency(selectedBooking.advanceAmount)} via {selectedBooking.advancePaymentMethod}
                      </p>
                    </div>
                  )}

                  {/* Collection Details */}
                  {selectedBooking.collectionOdometer && (
                    <div className="rounded-xl bg-emerald-50 p-4">
                      <p className="text-xs text-emerald-600 mb-2">Collection Details</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Odometer</p>
                          <p className="font-semibold text-slate-900">{selectedBooking.collectionOdometer} km</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Fuel Level</p>
                          <p className="font-semibold text-slate-900">{selectedBooking.collectionFuelLevel}</p>
                        </div>
                      </div>
                      {selectedBooking.collectedAt && (
                        <p className="text-xs text-emerald-500 mt-2 pt-2 border-t border-emerald-200">
                          Collected: {new Date(selectedBooking.collectedAt).toLocaleString()}
                        </p>
                      )}
                      {selectedBooking.collectionNotes && (
                        <p className="text-sm text-slate-600 mt-2">Notes: {selectedBooking.collectionNotes}</p>
                      )}
                    </div>
                  )}

                  {/* Documents */}
                  {selectedBooking.documents && selectedBooking.documents.length > 0 && (
                    <div className="rounded-xl bg-amber-50 p-4">
                      <p className="text-xs text-amber-600 mb-2">Uploaded Documents ({selectedBooking.documents.length})</p>
                      <div className="space-y-2">
                        {selectedBooking.documents.map((doc) => (
                          <div key={doc.id} className="flex items-center justify-between bg-white rounded-lg p-2 border border-amber-200">
                            <div className="flex items-center gap-2 min-w-0">
                              <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">{doc.title}</p>
                                <p className="text-xs text-slate-500">{doc.type} • {doc.stage}</p>
                              </div>
                            </div>
                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0 p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition"
                              title="View Document"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Return Details */}
                  {selectedBooking.returnOdometer && (
                    <div className="rounded-xl bg-purple-50 p-4">
                      <p className="text-xs text-purple-600 mb-2">Return Details</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Odometer</p>
                          <p className="font-semibold text-slate-900">{selectedBooking.returnOdometer} km</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Fuel Level</p>
                          <p className="font-semibold text-slate-900">{selectedBooking.returnFuelLevel}</p>
                        </div>
                      </div>
                      {selectedBooking.returnedAt && (
                        <p className="text-xs text-purple-500 mt-2 pt-2 border-t border-purple-200">
                          Returned: {new Date(selectedBooking.returnedAt).toLocaleString()}
                        </p>
                      )}
                      {selectedBooking.returnNotes && (
                        <p className="text-sm text-slate-600 mt-2">Notes: {selectedBooking.returnNotes}</p>
                      )}
                      {selectedBooking.totalMileage && (
                        <div className="mt-3 pt-3 border-t border-purple-200 text-sm">
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-slate-500">Total</p>
                              <p className="font-bold text-slate-900">{selectedBooking.totalMileage} km</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Free</p>
                              <p className="font-bold text-emerald-600">{selectedBooking.freeMileage} km</p>
                            </div>
                            <div>
                              <p className="text-slate-500">Extra</p>
                              <p className="font-bold text-orange-600">{selectedBooking.extraMileage} km</p>
                            </div>
                          </div>
                          {selectedBooking.extraMileageCost && selectedBooking.extraMileageCost > 0 && (
                            <p className="text-center font-semibold text-purple-700 mt-2">
                              Extra Mileage Cost: {formatCurrency(selectedBooking.extraMileageCost)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Additional Charges */}
                  {(selectedBooking.fuelCharge || selectedBooking.damageCharge || selectedBooking.lateReturnCharge || selectedBooking.otherCharges || selectedBooking.discountAmount) && (
                    <div className="rounded-xl bg-orange-50 p-4">
                      <p className="text-xs text-orange-600 mb-2">Additional Charges & Adjustments</p>
                      <div className="space-y-1 text-sm">
                        {selectedBooking.fuelCharge && selectedBooking.fuelCharge > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Fuel Charge</span>
                            <span className="font-medium text-orange-700">+{formatCurrency(selectedBooking.fuelCharge)}</span>
                          </div>
                        )}
                        {selectedBooking.damageCharge && selectedBooking.damageCharge > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Damage Charge</span>
                            <span className="font-medium text-orange-700">+{formatCurrency(selectedBooking.damageCharge)}</span>
                          </div>
                        )}
                        {selectedBooking.lateReturnCharge && selectedBooking.lateReturnCharge > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Late Return Charge</span>
                            <span className="font-medium text-orange-700">+{formatCurrency(selectedBooking.lateReturnCharge)}</span>
                          </div>
                        )}
                        {selectedBooking.otherCharges && selectedBooking.otherCharges > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">
                              Other Charges
                              {selectedBooking.otherChargesNote && <span className="text-xs ml-1">({selectedBooking.otherChargesNote})</span>}
                            </span>
                            <span className="font-medium text-orange-700">+{formatCurrency(selectedBooking.otherCharges)}</span>
                          </div>
                        )}
                        {selectedBooking.discountAmount && selectedBooking.discountAmount > 0 && (
                          <div className="flex justify-between pt-2 border-t border-orange-200">
                            <span className="text-slate-600">
                              Discount
                              {selectedBooking.discountReason && <span className="text-xs ml-1">({selectedBooking.discountReason})</span>}
                            </span>
                            <span className="font-medium text-green-600">-{formatCurrency(selectedBooking.discountAmount)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Final Amount */}
                  {selectedBooking.finalAmount && (
                    <div className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Final Amount</span>
                        <span className="text-2xl font-bold">{formatCurrency(selectedBooking.finalAmount)}</span>
                      </div>
                      {selectedBooking.advancePaid && selectedBooking.advanceAmount && selectedBooking.advanceAmount > 0 && (
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/30 text-sm">
                          <span>Advance Paid</span>
                          <span className="font-medium">-{formatCurrency(selectedBooking.advanceAmount)}</span>
                        </div>
                      )}
                      {selectedBooking.balanceDue !== null && selectedBooking.balanceDue !== undefined && (
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/30">
                          <span className="font-medium">Balance Due</span>
                          <span className="font-bold text-lg">{formatCurrency(selectedBooking.balanceDue)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Invoice Link */}
                  {selectedBooking.invoice && (
                    <div className="rounded-xl bg-slate-100 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-slate-500">Invoice</p>
                          <p className="font-semibold text-slate-900">{selectedBooking.invoice.invoiceNumber}</p>
                          <p className="text-xs text-slate-500">Status: {selectedBooking.invoice.status}</p>
                        </div>
                        <Link
                          href={`/admin/invoices/${selectedBooking.invoice.id}`}
                          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                        >
                          View Invoice
                        </Link>
                      </div>
                    </div>
                  )}

                  {/* Cancel Button */}
                  {selectedBooking.status !== "PAID" && selectedBooking.status !== "CANCELLED" && (
                    <button
                      onClick={handleCancel}
                      className="w-full py-2 text-red-600 hover:bg-red-50 rounded-xl transition text-sm font-medium"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              )}

              {/* ========== CONFIRM MODAL ========== */}
              {modalType === "confirm" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Advance Amount</label>
                      <input
                        type="number"
                        value={confirmForm.advanceAmount}
                        onChange={(e) => setConfirmForm({ ...confirmForm, advanceAmount: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                      <select
                        value={confirmForm.advancePaymentMethod}
                        onChange={(e) => setConfirmForm({ ...confirmForm, advancePaymentMethod: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                        disabled={!confirmForm.advancePaid}
                      >
                        {paymentMethods.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmForm.advancePaid}
                      onChange={(e) => setConfirmForm({ ...confirmForm, advancePaid: e.target.checked })}
                      className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-slate-900">Advance payment received</span>
                  </label>

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Mileage Settings</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Free Mileage (km)</label>
                        <input
                          type="number"
                          value={confirmForm.freeMileage}
                          onChange={(e) => setConfirmForm({ ...confirmForm, freeMileage: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Extra Mileage Rate ({formatCurrency(0).replace('0', '')}/km)</label>
                        <input
                          type="number"
                          value={confirmForm.extraMileageRate}
                          onChange={(e) => setConfirmForm({ ...confirmForm, extraMileageRate: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea
                      value={confirmForm.confirmationNotes}
                      onChange={(e) => setConfirmForm({ ...confirmForm, confirmationNotes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                      placeholder="Any notes about this confirmation..."
                    />
                  </div>
                </div>
              )}

              {/* ========== COLLECT MODAL ========== */}
              {modalType === "collect" && (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 rounded-xl">
                    <p className="text-sm text-emerald-700 font-medium mb-2">Vehicle Handover Checklist</p>
                    <ul className="text-xs text-emerald-600 space-y-1">
                      <li>• Verify customer ID and driving license</li>
                      <li>• Check vehicle condition and take photos</li>
                      <li>• Record odometer reading</li>
                      <li>• Check fuel level</li>
                      <li>• Hand over keys and documents</li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Odometer Reading (km) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={collectForm.collectionOdometer}
                        onChange={(e) => setCollectForm({ ...collectForm, collectionOdometer: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                        placeholder="e.g., 45000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Fuel Level</label>
                      <select
                        value={collectForm.collectionFuelLevel}
                        onChange={(e) => setCollectForm({ ...collectForm, collectionFuelLevel: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                      >
                        {fuelLevels.map((f) => (
                          <option key={f.value} value={f.value}>{f.label} ({f.percentage}%)</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Document Upload Section */}
                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Upload Documents</p>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Document Type</label>
                        <select
                          value={uploadForm.type}
                          onChange={(e) => setUploadForm({ ...uploadForm, type: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                        >
                          {documentTypes.map((d) => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Title (optional)</label>
                        <input
                          type="text"
                          value={uploadForm.title}
                          onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                          placeholder="e.g., Front of ID"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleDocumentUpload}
                        className="hidden"
                        id="doc-upload"
                      />
                      <label
                        htmlFor="doc-upload"
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-emerald-400 hover:bg-emerald-50 transition ${uploadingDoc ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {uploadingDoc ? (
                          <>
                            <svg className="animate-spin h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-sm text-slate-600">Uploading...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-sm text-slate-600">Click to upload document</span>
                          </>
                        )}
                      </label>
                    </div>

                    {/* Uploaded Documents List */}
                    {collectionDocuments.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-slate-500 font-medium">Uploaded Documents ({collectionDocuments.length})</p>
                        {collectionDocuments.map((doc, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-200"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">{doc.title}</p>
                                <p className="text-xs text-slate-500 truncate">{doc.fileName}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveDocument(index)}
                              className="p-1 text-red-500 hover:bg-red-100 rounded"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea
                      value={collectForm.collectionNotes}
                      onChange={(e) => setCollectForm({ ...collectForm, collectionNotes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                      placeholder="Vehicle condition notes, scratches, etc..."
                    />
                  </div>
                </div>
              )}

              {/* ========== COMPLETE MODAL ========== */}
              {modalType === "complete" && (
                <div className="space-y-4">
                  {/* Editable Rental Period */}
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <p className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Actual Rental Period (Editable)
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-blue-600 mb-1">Pickup Date</label>
                        <input
                          type="date"
                          value={completeForm.actualStartDate}
                          onChange={(e) => setCompleteForm({ ...completeForm, actualStartDate: e.target.value })}
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-blue-600 mb-1">Pickup Time</label>
                        <input
                          type="time"
                          value={completeForm.actualStartTime}
                          onChange={(e) => setCompleteForm({ ...completeForm, actualStartTime: e.target.value })}
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-blue-600 mb-1">Return Date</label>
                        <input
                          type="date"
                          value={completeForm.actualEndDate}
                          onChange={(e) => setCompleteForm({ ...completeForm, actualEndDate: e.target.value })}
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-blue-600 mb-1">Return Time</label>
                        <input
                          type="time"
                          value={completeForm.actualEndTime}
                          onChange={(e) => setCompleteForm({ ...completeForm, actualEndTime: e.target.value })}
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900 text-sm"
                        />
                      </div>
                    </div>
                    {/* Calculated Days Preview */}
                    {completeForm.actualStartDate && completeForm.actualEndDate && (
                      <div className="mt-3 pt-3 border-t border-blue-200 text-center">
                        <p className="text-sm text-blue-600">
                          Rental Duration: <span className="font-bold text-blue-800">
                            {Math.max(1, Math.ceil((new Date(`${completeForm.actualEndDate}T${completeForm.actualEndTime || "12:00"}`).getTime() - new Date(`${completeForm.actualStartDate}T${completeForm.actualStartTime || "12:00"}`).getTime()) / (1000 * 60 * 60 * 24)))} days
                          </span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-purple-50 rounded-xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-purple-700 font-medium">Collection Details</p>
                        <p className="text-xs text-purple-600">
                          Date: {selectedBooking.collectedAt && new Date(selectedBooking.collectedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-purple-700">{selectedBooking.collectionOdometer} km</p>
                        <p className="text-xs text-purple-600">Fuel: {selectedBooking.collectionFuelLevel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Return Odometer (km) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={completeForm.returnOdometer}
                        onChange={(e) => setCompleteForm({ ...completeForm, returnOdometer: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                        placeholder="e.g., 45500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Fuel Level</label>
                      <select
                        value={completeForm.returnFuelLevel}
                        onChange={(e) => setCompleteForm({ ...completeForm, returnFuelLevel: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                      >
                        {fuelLevels.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Mileage Preview */}
                  {mileagePreview && (
                    <div className="p-4 bg-slate-100 rounded-xl">
                      <p className="text-sm font-semibold text-slate-700 mb-2">Mileage Calculation</p>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-slate-500">Total Driven</p>
                          <p className="font-bold text-slate-900">{mileagePreview.totalMileage} km</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Free Mileage</p>
                          <p className="font-bold text-emerald-600">{mileagePreview.freeMileage} km</p>
                          <p className="text-xs text-emerald-500">
                            ({mileagePreview.rentalDays} days × {mileagePreview.freeMileagePerDay} km)
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Extra Mileage</p>
                          <p className="font-bold text-orange-600">{mileagePreview.extraMileage} km</p>
                        </div>
                      </div>
                      {mileagePreview.extraMileage > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-200 text-center">
                          <p className="text-sm text-slate-500">
                            Extra Mileage Cost ({mileagePreview.extraMileage} km × {formatCurrency(mileagePreview.extraRate)}/km)
                          </p>
                          <p className="text-xl font-bold text-orange-600">{formatCurrency(mileagePreview.extraCost)}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-sm font-semibold text-slate-700 mb-3">Additional Charges</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Fuel Charge</label>
                        <input
                          type="number"
                          value={completeForm.fuelCharge}
                          onChange={(e) => setCompleteForm({ ...completeForm, fuelCharge: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Damage Charge</label>
                        <input
                          type="number"
                          value={completeForm.damageCharge}
                          onChange={(e) => setCompleteForm({ ...completeForm, damageCharge: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Late Return Charge</label>
                        <input
                          type="number"
                          value={completeForm.lateReturnCharge}
                          onChange={(e) => setCompleteForm({ ...completeForm, lateReturnCharge: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Other Charges</label>
                        <input
                          type="number"
                          value={completeForm.otherCharges}
                          onChange={(e) => setCompleteForm({ ...completeForm, otherCharges: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                          placeholder="0"
                        />
                      </div>
                    </div>
                    {completeForm.otherCharges && (
                      <div className="mt-2">
                        <input
                          type="text"
                          value={completeForm.otherChargesNote}
                          onChange={(e) => setCompleteForm({ ...completeForm, otherChargesNote: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                          placeholder="Describe other charges..."
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Discount Amount</label>
                      <input
                        type="number"
                        value={completeForm.discountAmount}
                        onChange={(e) => setCompleteForm({ ...completeForm, discountAmount: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Discount Reason</label>
                      <input
                        type="text"
                        value={completeForm.discountReason}
                        onChange={(e) => setCompleteForm({ ...completeForm, discountReason: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                        placeholder="Reason for discount..."
                      />
                    </div>
                  </div>

                  {/* Package Booking Options */}
                  {selectedBooking?.isPackageBooking && (
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={completeForm.useFlatVehicleRate}
                          onChange={(e) => setCompleteForm({ ...completeForm, useFlatVehicleRate: e.target.checked })}
                          className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-purple-800">Use Flat Vehicle Rate</span>
                          <p className="text-xs text-purple-600">Ignore day count - charge vehicle price as a single flat rate instead of per-day</p>
                        </div>
                      </label>
                    </div>
                  )}

                  {/* Payment Summary Preview */}
                  {paymentPreview && (
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-slate-50 rounded-xl border border-purple-200">
                      <p className="text-sm font-semibold text-purple-700 mb-3">
                        Payment Summary Preview
                        {paymentPreview.isPackageBooking && (
                          <span className="ml-2 text-xs font-normal text-purple-500">(Package Booking)</span>
                        )}
                      </p>
                      <div className="space-y-2 text-sm">
                        {/* Vehicle Rental with breakdown */}
                        <div className="flex justify-between">
                          <span className="text-slate-600">
                            {paymentPreview.useFlatRate
                              ? `Vehicle Rental (Flat Rate)`
                              : `Vehicle Rental (${paymentPreview.rentalDays} days × ${formatCurrency(paymentPreview.dailyRate)})`
                            }
                          </span>
                          <span className="font-medium text-slate-900">{formatCurrency(paymentPreview.baseRental)}</span>
                        </div>

                        {/* Package Charges - show breakdown for package bookings */}
                        {paymentPreview.isPackageBooking && paymentPreview.packageBasePrice > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Package Base Price</span>
                            <span className="font-medium text-slate-900">+{formatCurrency(paymentPreview.packageBasePrice)}</span>
                          </div>
                        )}
                        {paymentPreview.isPackageBooking && paymentPreview.customCostsTotal > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Additional Services</span>
                            <span className="font-medium text-slate-900">+{formatCurrency(paymentPreview.customCostsTotal)}</span>
                          </div>
                        )}
                        {/* Regular package charges (for non-package bookings) */}
                        {!paymentPreview.isPackageBooking && paymentPreview.packageCharges > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Package Charges</span>
                            <span className="font-medium text-slate-900">+{formatCurrency(paymentPreview.packageCharges)}</span>
                          </div>
                        )}

                        {/* Additional Charges - itemized */}
                        {paymentPreview.extraMileageCost > 0 && (
                          <div className="flex justify-between text-orange-600">
                            <span>Extra Mileage</span>
                            <span className="font-medium">+{formatCurrency(paymentPreview.extraMileageCost)}</span>
                          </div>
                        )}
                        {paymentPreview.fuelCharge > 0 && (
                          <div className="flex justify-between text-orange-600">
                            <span>Fuel Charge</span>
                            <span className="font-medium">+{formatCurrency(paymentPreview.fuelCharge)}</span>
                          </div>
                        )}
                        {paymentPreview.damageCharge > 0 && (
                          <div className="flex justify-between text-orange-600">
                            <span>Damage Charge</span>
                            <span className="font-medium">+{formatCurrency(paymentPreview.damageCharge)}</span>
                          </div>
                        )}
                        {paymentPreview.lateReturnCharge > 0 && (
                          <div className="flex justify-between text-orange-600">
                            <span>Late Return Charge</span>
                            <span className="font-medium">+{formatCurrency(paymentPreview.lateReturnCharge)}</span>
                          </div>
                        )}
                        {paymentPreview.otherCharges > 0 && (
                          <div className="flex justify-between text-orange-600">
                            <span>Other Charges</span>
                            <span className="font-medium">+{formatCurrency(paymentPreview.otherCharges)}</span>
                          </div>
                        )}

                        {/* Discount */}
                        {paymentPreview.discountAmount > 0 && (
                          <div className="flex justify-between text-emerald-600">
                            <span>Discount</span>
                            <span className="font-medium">-{formatCurrency(paymentPreview.discountAmount)}</span>
                          </div>
                        )}

                        {/* Final Amount */}
                        <div className="flex justify-between pt-2 border-t border-purple-200">
                          <span className="font-medium text-slate-700">Final Amount</span>
                          <span className="font-bold text-slate-900">{formatCurrency(paymentPreview.finalAmount)}</span>
                        </div>

                        {/* Advance Paid */}
                        {paymentPreview.advancePaid > 0 && (
                          <div className="flex justify-between text-emerald-700">
                            <span>Advance Paid</span>
                            <span className="font-medium">-{formatCurrency(paymentPreview.advancePaid)}</span>
                          </div>
                        )}

                        {/* Balance Due */}
                        <div className="flex justify-between pt-2 border-t border-purple-200">
                          <span className="font-bold text-purple-700">Balance Due</span>
                          <span className="text-xl font-bold text-purple-700">{formatCurrency(paymentPreview.balanceDue)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Return Notes</label>
                    <textarea
                      value={completeForm.returnNotes}
                      onChange={(e) => setCompleteForm({ ...completeForm, returnNotes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                      placeholder="Any notes about the return..."
                    />
                  </div>
                </div>
              )}

              {/* ========== INVOICE MODAL ========== */}
              {modalType === "invoice" && (
                <div className="space-y-4">
                  {/* Actual Rental Period - uses startDate/endDate which are updated when completing rental */}
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-sm font-semibold text-blue-700 mb-2">Actual Rental Period</p>
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                      <div>
                        <p className="text-xs text-blue-500">Pickup Date</p>
                        <p className="font-bold text-blue-900">
                          {selectedBooking.startDate
                            ? new Date(selectedBooking.startDate).toLocaleDateString()
                            : "-"}
                        </p>
                        <p className="text-xs text-blue-400">
                          {selectedBooking.startDate
                            ? new Date(selectedBooking.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-500">Return Date</p>
                        <p className="font-bold text-blue-900">
                          {selectedBooking.endDate
                            ? new Date(selectedBooking.endDate).toLocaleDateString()
                            : "-"}
                        </p>
                        <p className="text-xs text-blue-400">
                          {selectedBooking.endDate
                            ? new Date(selectedBooking.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : ""}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-blue-500">Actual Days</p>
                        <p className="font-bold text-blue-900">
                          {selectedBooking.startDate && selectedBooking.endDate
                            ? calculateRentalDays(selectedBooking.startDate, selectedBooking.endDate)
                            : "-"} days
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mileage Details */}
                  {selectedBooking.totalMileage !== null && (
                    <div className="p-4 bg-slate-100 rounded-xl">
                      <p className="text-sm font-semibold text-slate-700 mb-2">Mileage Details</p>
                      <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Total Driven</p>
                          <p className="font-bold text-slate-900">{selectedBooking.totalMileage} km</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Free Mileage</p>
                          <p className="font-bold text-emerald-600">{selectedBooking.freeMileage} km</p>
                          <p className="text-xs text-emerald-500">
                            ({selectedBooking.startDate && selectedBooking.endDate
                              ? calculateRentalDays(selectedBooking.startDate, selectedBooking.endDate)
                              : "-"} days × {mileageConfig.freeMileagePerDay} km)
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Extra</p>
                          <p className="font-bold text-orange-600">{selectedBooking.extraMileage || 0} km</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-orange-50 rounded-xl">
                    <p className="text-sm text-orange-700 font-medium mb-2">Invoice Summary</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Base Rental</span>
                        <span className="font-medium">{formatCurrency(selectedBooking.totalPrice)}</span>
                      </div>
                      {selectedBooking.extraMileageCost && selectedBooking.extraMileageCost > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Extra Mileage ({selectedBooking.extraMileage} km × {formatCurrency(selectedBooking.extraMileageRate || mileageConfig.extraMileageRate)}/km)</span>
                          <span className="font-medium text-orange-600">+{formatCurrency(selectedBooking.extraMileageCost)}</span>
                        </div>
                      )}
                      {selectedBooking.fuelCharge && selectedBooking.fuelCharge > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Fuel Charge</span>
                          <span className="font-medium">{formatCurrency(selectedBooking.fuelCharge)}</span>
                        </div>
                      )}
                      {selectedBooking.damageCharge && selectedBooking.damageCharge > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-600">Damage Charge</span>
                          <span className="font-medium">{formatCurrency(selectedBooking.damageCharge)}</span>
                        </div>
                      )}
                      {selectedBooking.discountAmount && selectedBooking.discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Discount</span>
                          <span className="font-medium">-{formatCurrency(selectedBooking.discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-orange-200 font-bold">
                        <span>Total</span>
                        <span>{formatCurrency(selectedBooking.finalAmount || selectedBooking.totalPrice)}</span>
                      </div>
                      {selectedBooking.advancePaid && selectedBooking.advanceAmount && selectedBooking.advanceAmount > 0 && (
                        <>
                          <div className="flex justify-between text-blue-600">
                            <span>Advance Paid</span>
                            <span className="font-medium">-{formatCurrency(selectedBooking.advanceAmount)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-orange-700">
                            <span>Balance Due</span>
                            <span>{formatCurrency(selectedBooking.balanceDue || 0)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-500">
                    Click &quot;Generate Invoice&quot; to create an invoice for this booking. The invoice can then be sent to the customer via email or WhatsApp.
                  </p>
                </div>
              )}

              {/* ========== PAYMENT MODAL ========== */}
              {modalType === "payment" && selectedBooking.invoice && (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-green-700 font-medium">Invoice #{selectedBooking.invoice.invoiceNumber}</p>
                        <p className="text-xs text-green-600">Status: {selectedBooking.invoice.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500">Balance Due</p>
                        <p className="text-xl font-bold text-green-700">{formatCurrency(selectedBooking.invoice.balanceDue)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Payment Amount</label>
                      <input
                        type="number"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                      <select
                        value={paymentForm.method}
                        onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                      >
                        {paymentMethods.map((m) => (
                          <option key={m.value} value={m.value}>{m.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Reference Number</label>
                    <input
                      type="text"
                      value={paymentForm.reference}
                      onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                      placeholder="Transaction reference..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                      placeholder="Payment notes..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-slate-100">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition"
              >
                Cancel
              </button>

              {modalType === "confirm" && (
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Confirm Booking"}
                </button>
              )}

              {modalType === "collect" && (
                <button
                  onClick={handleCollect}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Mark Collected"}
                </button>
              )}

              {modalType === "complete" && (
                <button
                  onClick={handleComplete}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-medium hover:bg-purple-700 transition disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Complete Rental"}
                </button>
              )}

              {modalType === "invoice" && (
                <button
                  onClick={handleGenerateInvoice}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 text-white font-medium hover:bg-orange-700 transition disabled:opacity-50"
                >
                  {loading ? "Generating..." : "Generate Invoice"}
                </button>
              )}

              {modalType === "payment" && (
                <button
                  onClick={handleRecordPayment}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition disabled:opacity-50"
                >
                  {loading ? "Recording..." : "Record Payment"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Booking Modal */}
      <CreateBookingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          setShowCreateModal(false);
          router.refresh();
        }}
      />
    </>
  );
}
