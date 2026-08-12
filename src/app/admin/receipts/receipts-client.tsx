'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { receiptSchema, ReceiptInput } from '@/validations/receipt';
import { createReceipt, deleteReceipt } from '@/actions/receipts';
import { Receipt as ReceiptIcon, Plus, Search, Calendar, Loader2, Trash2, Printer, Eye, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Modal from '@/components/ui/modal';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ReceiptData {
  id: string;
  receiptNo: string;
  studentId: string;
  studentName: string;
  batch: string;
  batchCode: string;
  totalAmount: number;
  dueAmount: number;
  paidAmount: number;
  paymentDate: string;
  createdAt: string;
  updatedAt: string;
}

interface ReceiptsClientProps {
  initialReceipts: ReceiptData[];
}

export default function ReceiptsClient({ initialReceipts }: ReceiptsClientProps) {
  const [receipts, setReceipts] = useState<ReceiptData[]>(initialReceipts);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [deletingReceipt, setDeletingReceipt] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReceiptInput>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
      studentId: '',
      studentName: '',
      batch: '',
      batchCode: '',
      totalAmount: 0,
      dueAmount: 0,
      paidAmount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
    },
  });

  const handleOpenAdd = () => {
    reset({
      studentId: '',
      studentName: '',
      batch: '',
      batchCode: '',
      totalAmount: 0,
      dueAmount: 0,
      paidAmount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
    });
    setIsOpen(true);
  };

  const handlePrint = (receipt: ReceiptData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup blocker is active. Please allow popups for printing.');
      return;
    }
    
    const formattedDate = format(new Date(receipt.paymentDate), 'MMMM dd, yyyy');
    const remainingDue = Math.max(0, receipt.dueAmount - receipt.paidAmount);

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt - ${receipt.receiptNo}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              padding: 40px;
              color: #1e293b;
              background-color: #ffffff;
            }
            .receipt-container {
              max-width: 650px;
              margin: 0 auto;
              border: 1px solid #e2e8f0;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            }
            .company-header {
              text-align: center;
              margin-bottom: 25px;
            }
            .company-name {
              font-size: 24px;
              font-weight: 800;
              color: #4f46e5;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin: 0;
            }
            .company-details {
              font-size: 12px;
              color: #64748b;
              margin: 4px 0 0 0;
              font-weight: 500;
              line-height: 1.5;
            }
            .receipt-title-box {
              text-align: center;
              border-top: 2px dashed #cbd5e1;
              border-bottom: 2px dashed #cbd5e1;
              padding: 10px 0;
              margin: 20px 0;
            }
            .receipt-title {
              margin: 0;
              font-size: 18px;
              font-weight: 700;
              letter-spacing: 0.1em;
              color: #0f172a;
              text-transform: uppercase;
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 25px;
            }
            .meta-box {
              background-color: #f8fafc;
              padding: 12px 16px;
              border-radius: 10px;
              border: 1px solid #f1f5f9;
            }
            .meta-label {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              color: #64748b;
              margin-bottom: 4px;
            }
            .meta-value {
              font-size: 14px;
              font-weight: 600;
              color: #0f172a;
            }
            .divider {
              border-top: 1px solid #e2e8f0;
              margin: 20px 0;
            }
            .info-table {
              width: 100%;
              font-size: 13px;
              border-collapse: collapse;
            }
            .info-table td {
              padding: 8px 0;
            }
            .info-label {
              color: #64748b;
              font-weight: 500;
              width: 130px;
            }
            .info-value {
              color: #0f172a;
              font-weight: 600;
            }
            .item-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            .item-table th {
              text-align: left;
              padding: 10px 8px;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              color: #64748b;
              border-bottom: 2px solid #e2e8f0;
            }
            .item-table td {
              padding: 14px 8px;
              font-size: 13px;
              color: #334155;
              border-bottom: 1px solid #f1f5f9;
            }
            .total-row {
              font-weight: 700;
            }
            .amount-card {
              display: flex;
              justify-content: space-between;
              padding: 12px 16px;
              margin-bottom: 10px;
              border-radius: 8px;
            }
            .amount-paid {
              background-color: #f0fdf4;
              border: 1px solid #dcfce7;
              color: #15803d;
            }
            .amount-due {
              background-color: #fef2f2;
              border: 1px solid #fee2e2;
              color: #b91c1c;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 11px;
              color: #94a3b8;
              border-top: 2px dashed #cbd5e1;
              padding-top: 25px;
              line-height: 1.6;
            }
            @media print {
              body {
                padding: 0;
                background-color: #ffffff;
              }
              .receipt-container {
                border: none;
                box-shadow: none;
                padding: 10px;
                max-width: 100%;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="company-header">
              <h1 class="company-name">Substring Technologies</h1>
              <p class="company-details">
                B. R. Dubey Enclave, Deva Road, Lucknow<br/>
                Contact: +91 9839466732 &bull; Support: support@substringtechnologies.com
              </p>
            </div>

            <div class="receipt-title-box">
              <h2 class="receipt-title">Payment Receipt</h2>
            </div>
            
            <div class="details-grid">
              <div class="meta-box">
                <div class="meta-label">Receipt Number</div>
                <div class="meta-value" style="font-family: monospace; font-size: 15px;">${receipt.receiptNo}</div>
              </div>
              <div class="meta-box" style="text-align: right;">
                <div class="meta-label">Payment Date</div>
                <div class="meta-value">${formattedDate}</div>
              </div>
            </div>

            <div class="divider"></div>

            <div style="margin-bottom: 25px;">
              <h3 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em;">Student & Course Info</h3>
              <table class="info-table">
                <tr>
                  <td class="info-label">Student ID:</td>
                  <td class="info-value">${receipt.studentId || 'N/A'}</td>
                </tr>
                <tr>
                  <td class="info-label">Student Name:</td>
                  <td class="info-value">${receipt.studentName}</td>
                </tr>
                <tr>
                  <td class="info-label">Batch:</td>
                  <td class="info-value">${receipt.batch}</td>
                </tr>
                <tr>
                  <td class="info-label">Batch Code:</td>
                  <td class="info-value">${receipt.batchCode || 'N/A'}</td>
                </tr>
              </table>
            </div>

            <div class="divider"></div>

            <h3 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; text-transform: uppercase; color: #475569; letter-spacing: 0.05em;">Financial Breakdown</h3>
            <table class="item-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Total Batch Fee</td>
                  <td style="text-align: right; font-weight: 600;">₹${receipt.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td>Paid Amount</td>
                  <td style="text-align: right; color: #16a34a; font-weight: 700;">₹${receipt.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
                <tr class="total-row">
                  <td style="color: #b91c1c;">Due Amount</td>
                  <td style="text-align: right; color: #b91c1c; font-size: 15px; font-weight: 700;">₹${remainingDue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>

            <div class="footer">
              <p><strong>Thank you for your payment!</strong></p>
              <p>This is an official payment confirmation receipt generated digitally.<br/>
              No physical signature is required.</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const onSubmit = async (data: ReceiptInput) => {
    setIsLoading(true);
    try {
      const result = await createReceipt(data);
      if (result.error) {
        toast.error(result.error);
      } else if (result.success && result.receipt) {
        toast.success(`Receipt ${result.receipt.receiptNo} generated successfully!`);
        
        const newReceiptSerialized: ReceiptData = {
          ...result.receipt,
          paymentDate: result.receipt.paymentDate.toISOString(),
          createdAt: result.receipt.createdAt.toISOString(),
          updatedAt: result.receipt.updatedAt.toISOString(),
        };
        
        setReceipts(prev => [newReceiptSerialized, ...prev]);
        setIsOpen(false);
        reset();
        
        // Open receipt print view directly
        handlePrint(newReceiptSerialized);
      }
    } catch (err) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingReceipt) return;
    setIsLoading(true);
    try {
      const result = await deleteReceipt(deletingReceipt.id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Receipt deleted successfully!');
        setReceipts(prev => prev.filter(r => r.id !== deletingReceipt.id));
        setDeletingReceipt(null);
      }
    } catch (err) {
      toast.error('Failed to delete receipt.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset page to 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  // Memoized filter receipts
  const filteredReceipts = useMemo(() => {
    const term = search.toLowerCase();
    if (!term) return receipts;
    return receipts.filter(r => 
      r.studentName.toLowerCase().includes(term) ||
      r.receiptNo.toLowerCase().includes(term) ||
      r.batch.toLowerCase().includes(term) ||
      r.studentId.toLowerCase().includes(term)
    );
  }, [receipts, search]);

  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);

  const paginatedReceipts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredReceipts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredReceipts, currentPage]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fee Receipts</h1>
          <p className="text-xs text-muted-foreground">
            Manage, generate, and print student payment receipts for Substring Technologies.
          </p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-600 hover:to-fuchsia-600 text-white rounded-xl shadow-lg shadow-indigo-500/10 text-xs font-semibold active:scale-[0.98] transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Fee Receipt</span>
        </button>
      </div>

      {/* Toolbar / Search */}
      <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by student name, ID, batch, or receipt number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-background/50 border border-border rounded-lg pl-9 pr-4 py-1.5 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Receipts Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-md">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="font-semibold text-xs py-3 pl-4">Receipt No</TableHead>
              <TableHead className="font-semibold text-xs py-3">Student ID</TableHead>
              <TableHead className="font-semibold text-xs py-3">Student Name</TableHead>
              <TableHead className="font-semibold text-xs py-3">Batch & Code</TableHead>
              <TableHead className="font-semibold text-xs py-3">Total Course Fee</TableHead>
              <TableHead className="font-semibold text-xs py-3">Paid Amount</TableHead>
              <TableHead className="font-semibold text-xs py-3">Payment Date</TableHead>
              <TableHead className="font-semibold text-xs py-3 pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedReceipts.map((receipt) => {
              return (
                <TableRow key={receipt.id} className="hover:bg-muted/20">
                  <TableCell className="font-mono font-bold text-[11px] text-indigo-400 py-3.5 pl-4">
                    {receipt.receiptNo}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {receipt.studentId || '-'}
                  </TableCell>
                  <TableCell className="font-semibold text-xs text-foreground">
                    {receipt.studentName}
                  </TableCell>
                  <TableCell className="text-xs text-foreground/80">
                    <span className="font-medium">{receipt.batch}</span>
                    {receipt.batchCode && <span className="block text-[10px] text-muted-foreground font-mono">{receipt.batchCode}</span>}
                  </TableCell>
                  <TableCell className="text-xs text-foreground font-semibold">
                    ₹{receipt.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-xs text-emerald-500 font-bold">
                    ₹{receipt.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(receipt.paymentDate), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell className="py-3 pr-4 text-right space-x-2">
                    <button
                      onClick={() => setSelectedReceipt(receipt)}
                      className="p-1.5 text-muted-foreground hover:text-indigo-400 rounded-lg hover:bg-muted/80 transition cursor-pointer"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePrint(receipt)}
                      className="p-1.5 text-muted-foreground hover:text-amber-400 rounded-lg hover:bg-muted/80 transition cursor-pointer"
                      title="Print Receipt"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeletingReceipt(receipt)}
                      className="p-1.5 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-muted/80 transition cursor-pointer"
                      title="Delete Receipt"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {filteredReceipts.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  <div className="max-w-xs mx-auto space-y-2">
                    <ReceiptIcon className="w-8 h-8 text-muted-foreground mx-auto opacity-60" />
                    <p className="text-xs font-semibold">No receipts found</p>
                    <p className="text-[11px] text-muted-foreground/80">Generate a new receipt to view and print fee payment confirmations.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border border-border bg-card rounded-xl px-4 py-3 shadow-sm text-xs">
          <div className="text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
            <span className="font-semibold text-foreground">
              {Math.min(currentPage * itemsPerPage, filteredReceipts.length)}
            </span>{' '}
            of <span className="font-semibold text-foreground">{filteredReceipts.length}</span> receipts
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="rounded-xl px-3 py-1 text-xs"
            >
              Previous
            </Button>
            <div className="flex items-center space-x-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`h-7 w-7 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    currentPage === page
                      ? 'bg-indigo-500 text-white'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="rounded-xl px-3 py-1 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Generate Receipt Modal */}
      <Modal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title="Generate Fee Receipt"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Student ID
              </Label>
              <Input
                {...register('studentId')}
                type="text"
                placeholder="e.g. SUB-10294"
                disabled={isLoading}
                className="w-full bg-background border-border rounded-xl py-2 px-3 text-foreground placeholder-muted-foreground focus-visible:border-indigo-500 text-xs transition duration-200"
              />
              {errors.studentId && (
                <p className="text-xs text-rose-400 font-medium mt-0.5">{errors.studentId.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Student Name
              </Label>
              <Input
                {...register('studentName')}
                type="text"
                placeholder="e.g. John Doe"
                disabled={isLoading}
                className="w-full bg-background border-border rounded-xl py-2 px-3 text-foreground placeholder-muted-foreground focus-visible:border-indigo-500 text-xs transition duration-200"
              />
              {errors.studentName && (
                <p className="text-xs text-rose-400 font-medium mt-0.5">{errors.studentName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Batch
              </Label>
              <Input
                {...register('batch')}
                type="text"
                placeholder="e.g. Python Fullstack"
                disabled={isLoading}
                className="w-full bg-background border-border rounded-xl py-2 px-3 text-foreground placeholder-muted-foreground focus-visible:border-indigo-500 text-xs transition duration-200"
              />
              {errors.batch && (
                <p className="text-xs text-rose-400 font-medium mt-0.5">{errors.batch.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Batch Code
              </Label>
              <Input
                {...register('batchCode')}
                type="text"
                placeholder="e.g. PY-2026-A"
                disabled={isLoading}
                className="w-full bg-background border-border rounded-xl py-2 px-3 text-foreground placeholder-muted-foreground focus-visible:border-indigo-500 text-xs transition duration-200"
              />
              {errors.batchCode && (
                <p className="text-xs text-rose-400 font-medium mt-0.5">{errors.batchCode.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total Course Fee (₹)
              </Label>
              <Input
                {...register('totalAmount', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="0.00"
                disabled={isLoading}
                className="w-full bg-background border-border rounded-xl py-2 px-3 text-foreground placeholder-muted-foreground focus-visible:border-indigo-500 text-xs transition duration-200"
              />
              {errors.totalAmount && (
                <p className="text-xs text-rose-400 font-medium mt-0.5">{errors.totalAmount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Due Amount (₹)
              </Label>
              <Input
                {...register('dueAmount', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="0.00"
                disabled={isLoading}
                className="w-full bg-background border-border rounded-xl py-2 px-3 text-foreground placeholder-muted-foreground focus-visible:border-indigo-500 text-xs transition duration-200"
              />
              {errors.dueAmount && (
                <p className="text-xs text-rose-400 font-medium mt-0.5">{errors.dueAmount.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Paid Amount (₹)
              </Label>
              <Input
                {...register('paidAmount', { valueAsNumber: true })}
                type="number"
                step="0.01"
                placeholder="0.00"
                disabled={isLoading}
                className="w-full bg-background border-border rounded-xl py-2 px-3 text-foreground placeholder-muted-foreground focus-visible:border-indigo-500 text-xs transition duration-200"
              />
              {errors.paidAmount && (
                <p className="text-xs text-rose-400 font-medium mt-0.5">{errors.paidAmount.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Payment Date
            </Label>
            <Input
              {...register('paymentDate')}
              type="date"
              disabled={isLoading}
              className="w-full bg-background border-border rounded-xl py-2 px-3 text-foreground placeholder-muted-foreground focus-visible:border-indigo-500 text-xs transition duration-200"
            />
            {errors.paymentDate && (
              <p className="text-xs text-rose-400 font-medium mt-0.5">{errors.paymentDate.message}</p>
            )}
          </div>

          <Separator className="bg-muted/80 my-2" />

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
              disabled={isLoading}
              className="rounded-xl text-xs font-semibold text-foreground transition"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isLoading}
              className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-500 to-fuchsia-500 hover:from-indigo-650 hover:to-fuchsia-650 text-white text-xs font-semibold rounded-xl shadow-lg transition cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                  <span>Generating...</span>
                </>
              ) : (
                <span>Generate & Print</span>
              )}
            </Button>
          </div>

        </form>
      </Modal>

      {/* Details Preview Modal */}
      <Modal
        isOpen={!!selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
        title="Receipt Details"
      >
        {selectedReceipt && (
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center bg-muted/40 p-3 rounded-xl border border-border">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Receipt Number</p>
                <p className="text-sm font-mono font-bold text-foreground">{selectedReceipt.receiptNo}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-muted-foreground">Payment Date</p>
                <p className="text-sm font-semibold text-foreground">
                  {format(new Date(selectedReceipt.paymentDate), 'MMM dd, yyyy')}
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              <h3 className="font-bold text-foreground text-[10px] uppercase tracking-wider text-muted-foreground">Student & Course Info</h3>
              <div className="grid grid-cols-2 gap-2 bg-background p-3 rounded-xl border border-border/60">
                <div>
                  <p className="text-[10px] text-muted-foreground">Student ID</p>
                  <p className="font-semibold text-foreground">{selectedReceipt.studentId || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Student Name</p>
                  <p className="font-semibold text-foreground">{selectedReceipt.studentName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Batch Name</p>
                  <p className="font-semibold text-foreground">{selectedReceipt.batch}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Batch Code</p>
                  <p className="font-semibold text-foreground">{selectedReceipt.batchCode || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              <h3 className="font-bold text-foreground text-[10px] uppercase tracking-wider text-muted-foreground">Financial Summary</h3>
              <div className="space-y-2 bg-background p-3 rounded-xl border border-border/60">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Course Fee</span>
                  <span className="font-semibold text-foreground">₹{selectedReceipt.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Outstanding Dues</span>
                  <span className="font-semibold text-foreground">₹{selectedReceipt.dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-500 font-medium">Paid Amount (Now)</span>
                  <span className="font-bold text-emerald-500">₹{selectedReceipt.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <Separator className="bg-border/60 my-1" />
                <div className="flex justify-between font-bold">
                  <span className="text-foreground">Remaining Balance</span>
                  <span className={selectedReceipt.dueAmount - selectedReceipt.paidAmount > 0 ? 'text-rose-500' : 'text-foreground'}>
                    ₹{Math.max(0, selectedReceipt.dueAmount - selectedReceipt.paidAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            <Separator className="bg-muted/80 my-2" />

            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedReceipt(null)}
                className="rounded-xl text-xs font-semibold transition"
              >
                Close
              </Button>
              <Button
                onClick={() => handlePrint(selectedReceipt)}
                size="sm"
                className="inline-flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-650 text-white text-xs font-semibold rounded-xl shadow-lg transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                <span>Print Receipt</span>
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingReceipt}
        onClose={() => setDeletingReceipt(null)}
        title="Confirm Deletion"
      >
        <div className="space-y-4">
          <p className="text-xs text-foreground leading-relaxed">
            Are you sure you want to delete receipt <span className="font-bold text-foreground">"{deletingReceipt?.receiptNo}"</span> for student <span className="font-bold text-foreground">"{deletingReceipt?.studentName}"</span>? 
            This action cannot be undone.
          </p>
          <Separator className="bg-muted/80 my-2" />
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDeletingReceipt(null)}
              disabled={isLoading}
              className="rounded-xl text-xs font-semibold text-foreground transition"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              size="sm"
              disabled={isLoading}
              className="inline-flex items-center space-x-2 text-white text-xs font-semibold rounded-xl shadow-lg transition cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>Delete Receipt</span>
              )}
            </Button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
