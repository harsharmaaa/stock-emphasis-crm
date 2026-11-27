"use client";

import { useState, useEffect, useTransition } from "react";
import {
  X,
  Printer,
  Download,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  ShieldCheck,
} from "lucide-react";
import type { InvoiceTimelineEvent } from "./types";
import { getInvoiceTimelineAction, logInvoicePrintAction } from "./actions";

export interface ViewInvoiceData {
  id: string;
  serialNo: string;
  clientName: string;
  clientMobile: string;
  clientEmail: string | null;
  pan: string | null;
  dob?: string | null;
  clientState?: string | null;
  clientGstin?: string | null;
  latestNote?: string | null;
  productName: string;
  planType: string;
  durationLabel: string;
  startDate?: string | null;
  endDate?: string | null;
  invoiceDate: string;
  baseAmount: number;
  gstAmount: number;
  totalAmount: number;
  status: string;
  mailStatus?: string | null;
  createdByName?: string;
  assignedToName?: string | null;
  teamName?: string | null;
}

interface ViewInvoiceModalProps {
  invoice: ViewInvoiceData | null;
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "invoice" | "timeline";
}

function numberToIndianWords(num: number): string {
  const a = [
    "", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ",
    "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen ",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const integer = Math.floor(num);
  if (integer === 0) return "Zero Rupees Only";

  const numStr = integer.toString();
  if (numStr.length > 9) return `Rupees ${num.toLocaleString("en-IN")} Only`;

  function inWords(n: number): string {
    let str = "";
    if (n > 19) {
      str += b[Math.floor(n / 10)] + " " + a[n % 10];
    } else {
      str += a[n];
    }
    return str.trim();
  }

  let words = "";
  let n = integer;

  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  if (crore > 0) words += inWords(crore) + " Crore ";

  const lakh = Math.floor(n / 100000);
  n %= 100000;
  if (lakh > 0) words += inWords(lakh) + " Lakh ";

  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (thousand > 0) words += inWords(thousand) + " Thousand ";

  const hundred = Math.floor(n / 100);
  n %= 100;
  if (hundred > 0) words += inWords(hundred) + " Hundred ";

  if (n > 0) {
    if (words !== "") words += "and ";
    words += inWords(n);
  }

  return `Rupees ${words.trim()} Only`;
}

export function ViewInvoiceModal({
  invoice,
  isOpen,
  onClose,
  initialTab = "invoice",
}: ViewInvoiceModalProps) {
  const [activeTab, setActiveTab] = useState<"invoice" | "timeline">(initialTab);
  const [timeline, setTimeline] = useState<InvoiceTimelineEvent[]>([]);
  const [latestNote, setLatestNote] = useState<string | null>(invoice?.latestNote || null);
  const [isLoadingTimeline, setIsLoadingTimeline] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => {
      setActiveTab(initialTab);
      setLatestNote(invoice?.latestNote || null);
    }, 0);
    return () => clearTimeout(timer);
  }, [initialTab, invoice?.latestNote]);

  useEffect(() => {
    if (!isOpen || !invoice) return;

    let isMounted = true;
    const fetchTimeline = async () => {
      setIsLoadingTimeline(true);
      const res = await getInvoiceTimelineAction({
        invoiceId: invoice.id,
        serialNo: invoice.serialNo,
      });
      if (isMounted && res.success) {
        if (res.timeline) {
          setTimeline(res.timeline);
        }
        if (res.latestNote) {
          setLatestNote(res.latestNote);
        }
      }
      if (isMounted) {
        setIsLoadingTimeline(false);
      }
    };

    fetchTimeline();

    return () => {
      isMounted = false;
    };
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const handlePrint = () => {
    // Log print action asynchronously
    startTransition(async () => {
      await logInvoicePrintAction({
        invoiceId: invoice.id,
        serialNo: invoice.serialNo,
      });
    });

    window.print();
  };

  const getStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === "APPROVED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 className="w-3 h-3" />
          Approved
        </span>
      );
    }
    if (s === "CANCELLED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
          <AlertCircle className="w-3 h-3" />
          Cancelled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
        <Clock className="w-3 h-3" />
        Pending
      </span>
    );
  };

  // Indian GST split calculation: CGST (9%) + SGST (9%) vs IGST (18%)
  const stateStr = (invoice.clientState || "").toLowerCase();
  const isCgstSgst =
    stateStr.includes("madhya") ||
    stateStr === "mp" ||
    Boolean(invoice.clientGstin?.startsWith("23"));

  const totalGst = Number(invoice.gstAmount);
  const cgstAmount = Math.round((totalGst / 2) * 100) / 100;
  const sgstAmount = Math.round((totalGst - cgstAmount) * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Print Stylesheet override */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-tax-invoice, #printable-tax-invoice * {
            visibility: visible !important;
          }
          #printable-tax-invoice {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Invoice {invoice.serialNo}
                </h3>
                {getStatusBadge(invoice.status)}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Created {invoice.invoiceDate} • Client: {invoice.clientName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab switchers */}
            <div className="flex bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-semibold mr-2">
              <button
                type="button"
                onClick={() => setActiveTab("invoice")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === "invoice"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Tax Invoice
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("timeline")}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === "timeline"
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  }`}
              >
                <History className="w-3.5 h-3.5" />
                Audit Timeline
              </button>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              title="Print / Save PDF"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <Printer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="hidden sm:inline">Print</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              title="Download PDF"
              className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download PDF</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Internal Remarks / Compliance Note (On-screen ONLY, excluded from printable/downloadable Tax Invoice) */}
          {latestNote && activeTab === "invoice" && (
            <div className="no-print p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs animate-in fade-in duration-150">
              <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 mb-1">
                <FileText className="w-4 h-4" />
                <span>Internal Remarks / Approval Comment:</span>
              </div>
              <p className="text-slate-800 dark:text-slate-200 italic font-medium leading-relaxed">
                &ldquo;{latestNote}&rdquo;
              </p>
            </div>
          )}

          {activeTab === "invoice" ? (
            /* PRINTABLE TAX INVOICE */
            <div
              id="printable-tax-invoice"
              className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 space-y-6 shadow-sm font-sans"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start pb-6 border-b border-slate-200 dark:border-slate-800 gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">
                      STOCK EMPHASIS
                    </span>
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      Tax Invoice
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Financial Research & Advisory Services
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    SEBI Registered Investment Advisory Services
                  </p>
                  <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 mt-1">
                    GSTIN: <strong>23AAACS1234F1Z5</strong> • PAN: <strong>AAACS1234F</strong>
                  </p>
                </div>

                <div className="text-left sm:text-right space-y-1">
                  <div className="inline-block px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-800/60 font-mono font-bold text-sm text-blue-700 dark:text-blue-300">
                    {invoice.serialNo}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Invoice Date: <strong className="text-slate-800 dark:text-slate-200">{invoice.invoiceDate}</strong>
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Status: <strong className="uppercase">{invoice.status}</strong>
                  </p>
                </div>
              </div>

              {/* Billed To / Client Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Billed To (Client Details)
                  </h4>
                  <p className="font-bold text-sm text-slate-900 dark:text-white">
                    {invoice.clientName}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    Mobile: <span className="font-mono font-medium">{invoice.clientMobile}</span>
                  </p>
                  {invoice.clientEmail && (
                    <p className="text-slate-600 dark:text-slate-300">
                      Email: <span className="font-medium">{invoice.clientEmail}</span>
                    </p>
                  )}
                  <p className="text-slate-600 dark:text-slate-300">
                    PAN: <span className="font-mono font-semibold">{invoice.pan || "N/A"}</span>
                  </p>
                  {invoice.clientGstin && (
                    <p className="text-slate-600 dark:text-slate-300">
                      GSTIN: <span className="font-mono font-semibold">{invoice.clientGstin}</span>
                    </p>
                  )}
                  {invoice.clientState && (
                    <p className="text-slate-600 dark:text-slate-300">
                      State: <span className="font-medium">{invoice.clientState}</span>
                    </p>
                  )}
                  {invoice.dob && (
                    <p className="text-slate-600 dark:text-slate-300">
                      DOB: <span className="font-mono">{invoice.dob}</span>
                    </p>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-100 dark:border-slate-800">
                  <h4 className="font-bold text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                    Service Validity & Coverage
                  </h4>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {invoice.productName}
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                    Plan Type: <strong>{invoice.planType}</strong> ({invoice.durationLabel})
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    Validity Period:{" "}
                    <strong>
                      {invoice.startDate || "N/A"} to {invoice.endDate || "N/A"}
                    </strong>
                  </p>
                  <p className="text-slate-500 text-[11px] mt-1">
                    Place of Supply: Madhya Pradesh (State Code: 23)
                  </p>
                  <p className="text-blue-600 dark:text-blue-400 text-[11px] font-semibold mt-0.5">
                    Taxation: {isCgstSgst ? "Intra-State Supply (CGST + SGST)" : "Inter-State Supply (IGST)"}
                  </p>
                </div>
              </div>

              {/* Table of Services */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Service Description</th>
                      <th className="py-2.5 px-3">HSN / SAC</th>
                      <th className="py-2.5 px-3">Validity</th>
                      <th className="py-2.5 px-3 text-right">Taxable Value</th>
                      {isCgstSgst ? (
                        <>
                          <th className="py-2.5 px-3 text-right">CGST (9%)</th>
                          <th className="py-2.5 px-3 text-right">SGST (9%)</th>
                        </>
                      ) : (
                        <th className="py-2.5 px-3 text-right">IGST (18%)</th>
                      )}
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    <tr>
                      <td className="py-3 px-3 font-mono text-slate-400">1</td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {invoice.productName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Package: {invoice.planType} ({invoice.durationLabel})
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-500">998311</td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                        {invoice.startDate && invoice.endDate
                          ? `${invoice.startDate} - ${invoice.endDate}`
                          : invoice.durationLabel}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium">
                        ₹{invoice.baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      {isCgstSgst ? (
                        <>
                          <td className="py-3 px-3 text-right font-mono font-medium">
                            ₹{cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium">
                            ₹{sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </>
                      ) : (
                        <td className="py-3 px-3 text-right font-mono font-medium">
                          ₹{invoice.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      )}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                        ₹{invoice.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Summary */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
                <div className="max-w-xs space-y-1.5 text-xs">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Amount in Words:
                  </p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 italic">
                    {numberToIndianWords(invoice.totalAmount)}
                  </p>
                  <div className="pt-2 text-[10px] text-slate-500 space-y-0.5">
                    <p>• Reverse Charge Applicable: <strong>NO</strong></p>
                    <p>• {isCgstSgst ? "Inclusive 9% CGST + 9% SGST (Intra-state Supply)" : "Inclusive 18% Integrated Goods & Service Tax (IGST)"}</p>
                  </div>
                </div>

                <div className="w-full sm:w-72 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Taxable Base Value:</span>
                    <span className="font-mono">₹{invoice.baseAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                  {isCgstSgst ? (
                    <>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>CGST (9%):</span>
                        <span className="font-mono">₹{cgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-slate-600 dark:text-slate-400">
                        <span>SGST (9%):</span>
                        <span className="font-mono">₹{sgstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>IGST (18%):</span>
                      <span className="font-mono">₹{invoice.gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white">
                    <span>Total Paid:</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      ₹{invoice.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer / Signatory */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-end gap-6 text-xs text-slate-500">
                <div className="space-y-1 text-[11px]">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Declaration:
                  </p>
                  <p>
                    We declare that this invoice shows the actual price of the services described and that all particulars are true and correct.
                  </p>
                  <p className="text-[10px] text-slate-400">
                    This is a computer-generated document. No physical signature is required.
                  </p>
                </div>

                <div className="text-right sm:min-w-[200px]">
                  <div className="border-b border-dashed border-slate-300 dark:border-slate-700 pb-8 text-center">
                    <span className="text-[10px] text-slate-400 italic font-serif">
                      Digitally Verified by Compliance
                    </span>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">
                    Stock Emphasis Advisory
                  </p>
                  <p className="text-[10px] text-slate-500">Authorized Signatory</p>
                </div>
              </div>
            </div>
          ) : (
            /* AUDIT TIMELINE VIEW */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Complete Invoice Lifecycle & Audit Log
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Immutable history of all payment, approval, modification, and printing events.
                  </p>
                </div>
                {getStatusBadge(invoice.status)}
              </div>

              {isLoadingTimeline ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs">Loading audit events...</p>
                </div>
              ) : timeline.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No timeline events found for this invoice.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                  {timeline.map((event) => {
                    let dotColor = "bg-blue-500 ring-blue-100 dark:ring-blue-900/40";
                    if (event.badgeColor === "emerald") {
                      dotColor = "bg-emerald-500 ring-emerald-100 dark:ring-emerald-900/40";
                    } else if (event.badgeColor === "amber") {
                      dotColor = "bg-amber-500 ring-amber-100 dark:ring-amber-900/40";
                    } else if (event.badgeColor === "rose") {
                      dotColor = "bg-rose-500 ring-rose-100 dark:ring-rose-900/40";
                    }

                    return (
                      <div key={event.id} className="relative group">
                        {/* Dot */}
                        <div
                          className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full ring-4 ${dotColor}`}
                        />

                        {/* Content Card */}
                        <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm space-y-1.5">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                              {event.label}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400">
                              {event.displayTime}
                            </span>
                          </div>

                          {event.notes && (
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              {event.notes}
                            </p>
                          )}

                          <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3 text-slate-400" />
                              Actor: <strong className="text-slate-700 dark:text-slate-300">{event.actorName}</strong>
                              {event.actorRole && ` (${event.actorRole})`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="no-print flex items-center justify-between px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <span>Serial: <strong className="font-mono text-blue-600 dark:text-blue-400">{invoice.serialNo}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-200/70 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
