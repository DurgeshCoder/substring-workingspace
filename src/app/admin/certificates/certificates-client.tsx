'use client';

import React, { useState, useMemo, useRef } from 'react';
import { 
  Award, 
  Upload, 
  Search, 
  Trash2, 
  Printer, 
  Eye, 
  Download, 
  FileText, 
  X, 
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Filter,
  CheckSquare,
  Square,
  Check,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import Modal from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createCertificates, deleteCertificate, clearAllCertificates } from '@/actions/certificates';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface CertificateData {
  id: string;
  studentId: string;
  name: string;
  fromDate: string;
  toDate: string;
  course: string;
  batchId: string;
  createdAt: string;
}

interface ParsedCSVRow {
  studentId: string;
  name: string;
  fromDateStr: string;
  toDateStr: string;
  fromDate: string; // ISO string
  toDate: string; // ISO string
  course: string;
  batchId: string;
  isValid: boolean;
  error?: string;
}

interface CertificatesClientProps {
  initialCertificates: CertificateData[];
}

// Resilient Date Parser supporting common formats (DD-MM-YYYY, DD/MM/YYYY, ISO, Textual)
const parseDateResilient = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const cleanStr = dateStr.trim();

  // Try standard parse
  let d = new Date(cleanStr);
  if (!isNaN(d.getTime())) return d;

  // Try DD-MM-YYYY, DD/MM/YYYY or DD.MM.YYYY
  const dmyRegex = /^(\d{1,2})[-/\.](\d{1,2})[-/\.](\d{4})$/;
  const match = cleanStr.match(dmyRegex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed
    const year = parseInt(match[3], 10);
    d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }

  // Try parsing textual format (e.g. "01 June 2026")
  const timestamp = Date.parse(cleanStr);
  if (!isNaN(timestamp)) {
    return new Date(timestamp);
  }

  return null;
};

export default function CertificatesClient({ initialCertificates }: CertificatesClientProps) {
  const [certificates, setCertificates] = useState<CertificateData[]>(initialCertificates);
  
  // Filter states
  const [filterName, setFilterName] = useState('');
  const [filterStudentId, setFilterStudentId] = useState('');
  const [filterBatchId, setFilterBatchId] = useState('');

  // Selected certificates for marking & bulk export
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal / Preview states
  const [selectedCert, setSelectedCert] = useState<CertificateData | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<ParsedCSVRow[] | null>(null);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [certToDelete, setCertToDelete] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Extract unique Batch IDs
  const uniqueBatchIds = useMemo(() => {
    const batches = new Set<string>();
    certificates.forEach(c => {
      if (c.batchId) batches.add(c.batchId);
    });
    return Array.from(batches).sort();
  }, [certificates]);

  // CSV Parser
  const parseCSV = (text: string): ParsedCSVRow[] | null => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());
    
    const nameIdx = headers.findIndex(h => ['name', 'student name', 'student_name', 'full name'].includes(h));
    const idIdx = headers.findIndex(h => ['student id', 'student_id', 'id', 'reg id', 'reg_id', 'registration id', 'roll no', 'roll_number'].includes(h));
    const fromIdx = headers.findIndex(h => ['from date', 'from_date', 'start date', 'start_date', 'from'].includes(h));
    const toIdx = headers.findIndex(h => ['end date', 'end_date', 'to date', 'to_date', 'to'].includes(h));
    const courseIdx = headers.findIndex(h => ['course', 'course name', 'subject', 'training'].includes(h));
    const batchIdIdx = headers.findIndex(h => ['batch id', 'batch_id', 'batchid', 'batch', 'batch code', 'batch_code'].includes(h));

    if (nameIdx === -1 || idIdx === -1 || fromIdx === -1 || toIdx === -1) {
      toast.error('Invalid CSV columns. Required: name, student id, from date, end date');
      return null;
    }

    const results: ParsedCSVRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = [];
      let current = '';
      let inQuotes = false;
      for (let char of line) {
        if (char === '"' || char === "'") {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim().replace(/^["']|["']$/g, ''));

      if (values.length < Math.max(nameIdx, idIdx, fromIdx, toIdx) + 1) continue;

      const name = values[nameIdx];
      const studentId = values[idIdx];
      const fromVal = values[fromIdx];
      const toVal = values[toIdx];
      const course = courseIdx !== -1 ? values[courseIdx] : 'MERN STACK';
      const batchId = batchIdIdx !== -1 ? values[batchIdIdx] : '';

      // Validate dates
      const parsedFrom = parseDateResilient(fromVal);
      const parsedTo = parseDateResilient(toVal);

      let rowError = '';
      if (!name) rowError += 'Missing Name. ';
      if (!studentId) rowError += 'Missing Student ID. ';
      if (!parsedFrom) rowError += 'Invalid Start Date. ';
      if (!parsedTo) rowError += 'Invalid End Date. ';

      results.push({
        name: name || '',
        studentId: studentId || '',
        fromDateStr: fromVal || '',
        toDateStr: toVal || '',
        fromDate: parsedFrom ? parsedFrom.toISOString() : '',
        toDate: parsedTo ? parsedTo.toISOString() : '',
        course: course || 'MERN STACK',
        batchId: batchId || '',
        isValid: !rowError,
        error: rowError || undefined
      });
    }
    return results;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsedRows = parseCSV(text);
        if (parsedRows) {
          setCsvPreviewData(parsedRows);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!csvPreviewData || csvPreviewData.length === 0) return;
    
    const validRows = csvPreviewData.filter(row => row.isValid);
    if (validRows.length === 0) {
      toast.error('No valid rows found to import.');
      return;
    }

    setIsUploading(true);
    try {
      const payload = validRows.map(row => ({
        studentId: row.studentId,
        name: row.name,
        fromDate: row.fromDate,
        toDate: row.toDate,
        course: row.course,
        batchId: row.batchId
      }));

      const res = await createCertificates(payload);
      if (res.success) {
        toast.success(`Successfully uploaded and generated ${res.count} certificates.`);
        setCsvPreviewData(null);
        window.location.reload();
      } else {
        toast.error(res.error || 'Failed to upload certificates.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('An error occurred during import.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filtered certificates
  const filteredCerts = useMemo(() => {
    return certificates.filter((c) => {
      const matchName = !filterName || c.name.toLowerCase().includes(filterName.toLowerCase().trim());
      const matchStudentId = !filterStudentId || c.studentId.toLowerCase().includes(filterStudentId.toLowerCase().trim());
      const matchBatchId = !filterBatchId || c.batchId.toLowerCase().includes(filterBatchId.toLowerCase().trim());
      return matchName && matchStudentId && matchBatchId;
    });
  }, [certificates, filterName, filterStudentId, filterBatchId]);

  // Paginated certificates
  const paginatedCerts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCerts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCerts, currentPage]);

  const totalPages = Math.ceil(filteredCerts.length / itemsPerPage);

  const handleDelete = async () => {
    if (!certToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deleteCertificate(certToDelete);
      if (res.success) {
        toast.success('Certificate deleted successfully.');
        setCertificates(prev => prev.filter(c => c.id !== certToDelete));
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(certToDelete);
          return next;
        });
        setCertToDelete(null);
      } else {
        toast.error(res.error || 'Failed to delete certificate.');
      }
    } catch (err) {
      toast.error('An error occurred.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Are you sure you want to delete ALL certificates? This action cannot be undone.')) return;
    try {
      const res = await clearAllCertificates();
      if (res.success) {
        toast.success('All certificates deleted.');
        setCertificates([]);
        setSelectedIds(new Set());
      } else {
        toast.error(res.error || 'Failed to clear certificates.');
      }
    } catch (err) {
      toast.error('An error occurred.');
    }
  };

  // Selection managers
  const handleToggleSelectAll = () => {
    const visibleIds = paginatedCerts.map(c => c.id);
    const allSelected = visibleIds.every(id => selectedIds.has(id));

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) {
        visibleIds.forEach(id => next.delete(id));
      } else {
        visibleIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Format date helper for certificate
  const formatCertDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'dd MMMM yyyy');
    } catch (e) {
      return dateStr;
    }
  };

  // Get HTML content for a single certificate
  const getCertificateHTML = (cert: CertificateData) => {
    return `
      <div class="certificate-wrapper" style="
        width: 1120px;
        height: 792px;
        background-color: #ffffff;
        background-image: repeating-linear-gradient(45deg, #f3f6f9 0px, #f3f6f9 1px, transparent 1px, transparent 15px),
                          repeating-linear-gradient(-45deg, #f3f6f9 0px, #f3f6f9 1px, transparent 1px, transparent 15px);
        padding: 40px;
        box-sizing: border-box;
        position: relative;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #0d233a;
        border: 2px solid #e1e8ed;
        overflow: hidden;
      ">
        <!-- Inner Border Frame -->
        <div style="
          width: 100%;
          height: 100%;
          border: 1px solid #c8d6e5;
          position: relative;
          box-sizing: border-box;
          padding: 30px;
        ">
          <!-- Top Left Logo/Branding -->
          <div style="display: flex; align-items: center; gap: 12px; position: absolute; top: 30px; left: 30px;">
            <div style="width: 48px; height: 48px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
              <img src="/substring_logo.png" alt="Logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
            </div>
            <div>
              <h3 style="margin: 0; font-size: 15px; font-weight: 800; color: #0d233a; letter-spacing: 0.05em; text-transform: uppercase;">Substring Technologies</h3>
              <p style="margin: 2px 0 0 0; font-size: 9px; font-weight: 600; color: #7f8c8d; text-transform: uppercase; letter-spacing: 0.1em;">Training | Development | Consultancy</p>
              <p style="margin: 1px 0 0 0; font-size: 8px; color: #95a5a6; font-family: monospace;">contact@substringtechnologies.com, +91-9839466732</p>
            </div>
          </div>

          <!-- Top Right Ribbon Badge -->
          <div style="position: absolute; top: 20px; right: 30px;">
            <svg width="65" height="65" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M40 50L25 95L50 82L75 95L60 50" fill="#0B427B" />
              <path d="M50 50L38 95L50 86L62 95L50 50" fill="#0E65A3" />
              <circle cx="50" cy="40" r="30" fill="#0B427B" />
              <circle cx="50" cy="40" r="25" fill="#0E65A3" />
              <circle cx="50" cy="40" r="22" fill="#0B427B" stroke="#ffffff" stroke-width="2" stroke-dasharray="3 3" />
            </svg>
          </div>

          <!-- Center Content Area -->
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; padding-top: 60px;">
            <h1 style="margin: 0; font-size: 58px; font-weight: 900; letter-spacing: 0.12em; color: #0d233a; font-family: 'Times New Roman', Times, serif; text-transform: uppercase;">Certificate</h1>
            <h2 style="margin: 5px 0 35px 0; font-size: 16px; font-weight: 700; letter-spacing: 0.25em; color: #0E65A3; text-transform: uppercase;">Of Completion</h2>
            
            <p style="margin: 0 0 20px 0; font-size: 14px; font-style: italic; color: #576574;">This is to certify that</p>
            
            <h2 style="margin: 0; font-size: 38px; font-weight: 800; color: #0B427B; font-family: 'Segoe UI', Roboto, sans-serif;">${cert.name}</h2>
            <div style="width: 580px; height: 1px; background-color: #cbd5e1; margin: 15px auto 10px auto;"></div>
            
            <p style="margin: 0 0 25px 0; font-size: 14px; font-weight: 700; color: #475569; letter-spacing: 0.05em;">Reg. ID: ${cert.studentId}</p>
            
            <p style="margin: 0 0 8px 0; font-size: 15px; color: #2c3e50; line-height: 1.6;">
              has successfully completed the training on <strong style="color: #0d233a; font-weight: 800;">${cert.course}</strong>
            </p>
            <p style="margin: 0 0 25px 0; font-size: 15px; color: #2c3e50;">
              from <strong style="color: #0d233a; font-weight: 700;">${formatCertDate(cert.fromDate)}</strong> to <strong style="color: #0d233a; font-weight: 700;">${formatCertDate(cert.toDate)}</strong>
            </p>
            
            <p style="margin: 0; font-size: 13px; font-style: italic; color: #7f8c8d;">We wish good luck for their future endeavours.</p>
          </div>

          <!-- Bottom Layout / Signature / Address -->
          <div style="position: absolute; bottom: 30px; left: 30px; right: 30px; display: flex; justify-content: space-between; align-items: flex-end;">
            <!-- Address details -->
            <div style="display: flex; align-items: flex-start; gap: 8px; max-width: 480px; text-align: left;">
              <svg width="14" height="18" viewBox="0 0 24 24" fill="#E74C3C" xmlns="http://www.w3.org/2000/svg" style="margin-top: 2px;">
                <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z" />
              </svg>
              <div>
                <p style="margin: 0; font-size: 9px; font-weight: 700; color: #7f8c8d; line-height: 1.4; font-family: 'Segoe UI', sans-serif;">
                  Substring Technologies, 633/D/P256 B R Dubey Enclave<br/>
                  Dhanwa Deva Road Matiyari Chinhat, Lucknow, UP, INDIA 226028
                </p>
              </div>
            </div>

            <!-- Signature block -->
            <div style="text-align: center; width: 220px;">
              <div style="width: 100%; height: 1px; background-color: #7f8c8d; margin-bottom: 8px;"></div>
              <p style="margin: 0; font-size: 11px; font-weight: 700; color: #0d233a; text-transform: uppercase; letter-spacing: 0.05em;">Instructor</p>
              <p style="margin: 2px 0 0 0; font-size: 9px; color: #7f8c8d;">Substring Technologies</p>
            </div>
          </div>
        </div>

        <!-- Corner Abstract Shapes -->
        <!-- Bottom Left -->
        <div style="
          position: absolute;
          bottom: 0;
          left: 0;
          width: 220px;
          height: 160px;
          background: linear-gradient(135deg, transparent 50%, #0B427B 50%, #0E65A3);
          clip-path: polygon(0 100%, 100% 100%, 0 0);
          z-index: 1;
          opacity: 0.95;
        "></div>
        <div style="
          position: absolute;
          bottom: 0;
          left: 0;
          width: 250px;
          height: 90px;
          background: linear-gradient(135deg, transparent 40%, #0CA5D6 40%, #0E65A3);
          clip-path: polygon(0 100%, 100% 100%, 0 0);
          z-index: 0;
          opacity: 0.45;
        "></div>

        <!-- Bottom Right -->
        <div style="
          position: absolute;
          bottom: 0;
          right: 0;
          width: 220px;
          height: 160px;
          background: linear-gradient(-135deg, transparent 50%, #0B427B 50%, #0E65A3);
          clip-path: polygon(100% 100%, 0 100%, 100% 0);
          z-index: 1;
          opacity: 0.95;
        "></div>
        <div style="
          position: absolute;
          bottom: 0;
          right: 0;
          width: 250px;
          height: 90px;
          background: linear-gradient(-135deg, transparent 40%, #0CA5D6 40%, #0E65A3);
          clip-path: polygon(100% 100%, 0 100%, 100% 0);
          z-index: 0;
          opacity: 0.45;
        "></div>
      </div>
    `;
  };

  const handlePrint = (cert: CertificateData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Popup blocker is active. Please allow popups for printing.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Certificate - ${cert.studentId}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @media print {
              body {
                height: auto;
              }
              .certificate-wrapper {
                border: none !important;
                box-shadow: none !important;
              }
            }
          </style>
        </head>
        <body>
          ${getCertificateHTML(cert)}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Convert HTML element to PDF blob
  // Convert HTML element to PDF blob
  const generatePDFBlob = async (cert: CertificateData): Promise<Blob> => {
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.innerHTML = getCertificateHTML(cert);
    document.body.appendChild(tempDiv);

    try {
      const element = tempDiv.querySelector('.certificate-wrapper') as HTMLElement;
      
      // Wait for the logo image to be fully loaded
      const imgs = Array.from(element.getElementsByTagName('img'));
      await Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve(); // resolve anyway to avoid blocking
        });
      }));

      // Small delay for rendering calculations
      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Remove all stylesheet link and style elements in the cloned document
          // so that html2canvas CSS parser doesn't scan or fail on modern properties/colors (lab, oklch)
          const stylesheets = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
          stylesheets.forEach(el => el.remove());
        }
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
      
      return pdf.output('blob');
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  // Convert HTML element to PNG blob
  const generatePNGBlob = async (cert: CertificateData): Promise<Blob> => {
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.innerHTML = getCertificateHTML(cert);
    document.body.appendChild(tempDiv);

    try {
      const element = tempDiv.querySelector('.certificate-wrapper') as HTMLElement;
      
      // Wait for the logo image to be fully loaded
      const imgs = Array.from(element.getElementsByTagName('img'));
      await Promise.all(imgs.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      }));

      await new Promise(resolve => setTimeout(resolve, 100));

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        onclone: (clonedDoc) => {
          // Remove all stylesheet link and style elements in the cloned document
          // so that html2canvas CSS parser doesn't scan or fail on modern properties/colors (lab, oklch)
          const stylesheets = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
          stylesheets.forEach(el => el.remove());
        }
      });

      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to PNG blob'));
          }
        }, 'image/png');
      });
    } finally {
      document.body.removeChild(tempDiv);
    }
  };

  const handleDownloadSinglePNG = async (cert: CertificateData) => {
    try {
      toast.loading('Generating PNG...', { id: 'png-gen' });
      const pngBlob = await generatePNGBlob(cert);
      const url = URL.createObjectURL(pngBlob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = cert.name.replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `${cert.studentId}_${safeName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('PNG downloaded successfully!', { id: 'png-gen' });
    } catch (err: any) {
      toast.error('PNG download failed: ' + err.message, { id: 'png-gen' });
    }
  };

  // Bulk Export selected (marked) certificates
  const handleBulkExportSelected = async () => {
    const targets = certificates.filter(c => selectedIds.has(c.id));
    
    if (targets.length === 0) {
      toast.error('Please select (mark) at least one certificate to bulk export.');
      return;
    }

    setIsZipping(true);
    setZipProgress({ current: 0, total: targets.length });
    const zip = new JSZip();

    try {
      for (let i = 0; i < targets.length; i++) {
        const cert = targets[i];
        setZipProgress({ current: i + 1, total: targets.length });
        
        const pngBlob = await generatePNGBlob(cert);
        
        const safeName = cert.name.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${cert.studentId}_${safeName}.png`;
        
        zip.file(filename, pngBlob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Bulk_Certificates_PNG_${format(new Date(), 'yyyy-MM-dd')}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Successfully exported ${targets.length} marked certificates as PNGs in a ZIP archive!`);
    } catch (err: any) {
      console.error(err);
      toast.error('Export failed: ' + err.message);
    } finally {
      setIsZipping(false);
    }
  };

  // Check if all visible records are selected
  const isAllVisibleSelected = useMemo(() => {
    if (paginatedCerts.length === 0) return false;
    return paginatedCerts.every(c => selectedIds.has(c.id));
  }, [paginatedCerts, selectedIds]);

  const clearFilters = () => {
    setFilterName('');
    setFilterStudentId('');
    setFilterBatchId('');
    setCurrentPage(1);
  };

  const previewValidRowsCount = useMemo(() => {
    if (!csvPreviewData) return 0;
    return csvPreviewData.filter(r => r.isValid).length;
  }, [csvPreviewData]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Student Certificate Manager
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            Upload CSV list of students, filter by Name, Student ID, or Batch ID, mark certificates, and bulk export.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input */}
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded-xl transition duration-200 cursor-pointer shadow-md shadow-indigo-600/10"
          >
            {isUploading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-3.5 h-3.5 mr-2" />
                Upload CSV
              </>
            )}
          </Button>

          <Button
            onClick={handleBulkExportSelected}
            disabled={isZipping || selectedIds.size === 0}
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2 rounded-xl transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-600/10"
          >
            {isZipping ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                Exporting ({zipProgress.current}/{zipProgress.total})
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 mr-2" />
                Bulk Export Marked ({selectedIds.size})
              </>
            )}
          </Button>

          {certificates.length > 0 && (
            <Button
              onClick={handleClearAll}
              variant="destructive"
              className="bg-rose-500 hover:bg-rose-600 font-medium text-xs px-4 py-2 rounded-xl transition duration-200 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* CSV Instructions Card */}
      <Card className="border border-border/80 bg-card shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-5 flex items-start gap-4">
          <div className="p-3 bg-indigo-500/10 text-indigo-600 rounded-xl">
            <HelpCircle className="w-5 h-5 dark:text-indigo-400" />
          </div>
          <div className="flex-1 space-y-1">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">CSV Upload Guidelines</h4>
            <p className="text-muted-foreground text-xs">
              Upload a standard comma-separated values (.csv) file. The CSV file must contain headers matching these fields (case-insensitive):
            </p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
              <div className="p-2 bg-muted/60 rounded-lg border border-border/40 text-center">
                <span className="block text-[10px] font-mono font-bold text-foreground">name</span>
                <span className="text-[10px] text-muted-foreground">Student Name</span>
              </div>
              <div className="p-2 bg-muted/60 rounded-lg border border-border/40 text-center">
                <span className="block text-[10px] font-mono font-bold text-foreground">student id</span>
                <span className="text-[10px] text-muted-foreground">Roll / Reg ID</span>
              </div>
              <div className="p-2 bg-muted/60 rounded-lg border border-border/40 text-center">
                <span className="block text-[10px] font-mono font-bold text-foreground">from date</span>
                <span className="text-[10px] text-muted-foreground">Start Date</span>
              </div>
              <div className="p-2 bg-muted/60 rounded-lg border border-border/40 text-center">
                <span className="block text-[10px] font-mono font-bold text-foreground">end date</span>
                <span className="text-[10px] text-muted-foreground">End Date</span>
              </div>
              <div className="p-2 bg-muted/60 rounded-lg border border-border/40 text-center col-span-2 md:col-span-1">
                <span className="block text-[10px] font-mono font-bold text-foreground">batch id</span>
                <span className="text-[10px] text-muted-foreground">Batch ID Filter</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground/80 mt-2 font-semibold">
              * Optional columns: <code className="font-mono text-foreground font-bold">course</code> (defaults to <code className="font-mono font-bold text-indigo-500">MERN STACK</code>) and <code className="font-mono text-foreground font-bold">batch id</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CSV Preview Modal */}
      {csvPreviewData && (
        <Modal
          isOpen={!!csvPreviewData}
          onClose={() => setCsvPreviewData(null)}
          title="Import CSV Preview"
          className="max-w-6xl sm:max-w-6xl w-full bg-card border-border text-foreground max-h-[90vh] overflow-y-auto"
        >
          <div className="space-y-4">
            <div className="bg-muted/40 p-4 rounded-xl flex items-center justify-between border border-border/60">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground">Ready to Import</p>
                <p className="text-[11px] text-muted-foreground">
                  Found {csvPreviewData.length} records in CSV. {previewValidRowsCount} rows are valid and will be imported.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setCsvPreviewData(null)}
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={isUploading || previewValidRowsCount === 0}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Check className="w-3 h-3 mr-1" />
                      Confirm & Import ({previewValidRowsCount} rows)
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto border border-border/80 rounded-xl">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="text-[10px] font-bold py-2.5 pl-4">Status</TableHead>
                    <TableHead className="text-[10px] font-bold py-2.5">Student ID</TableHead>
                    <TableHead className="text-[10px] font-bold py-2.5">Student Name</TableHead>
                    <TableHead className="text-[10px] font-bold py-2.5">Course</TableHead>
                    <TableHead className="text-[10px] font-bold py-2.5">Batch ID</TableHead>
                    <TableHead className="text-[10px] font-bold py-2.5">Start Date</TableHead>
                    <TableHead className="text-[10px] font-bold py-2.5">End Date</TableHead>
                    <TableHead className="text-[10px] font-bold py-2.5 pr-4">Details / Errors</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csvPreviewData.map((row, index) => (
                    <TableRow key={index} className={`hover:bg-muted/10 border-b border-border/40 ${!row.isValid ? 'bg-rose-500/5' : ''}`}>
                      <TableCell className="py-2 pl-4">
                        {row.isValid ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                            Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-rose-500/10 text-rose-500 dark:text-rose-400">
                            Error
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-semibold py-2">{row.studentId || <span className="text-rose-500 font-bold">Empty</span>}</TableCell>
                      <TableCell className="text-xs font-bold py-2">{row.name || <span className="text-rose-500 font-bold">Empty</span>}</TableCell>
                      <TableCell className="text-xs py-2">{row.course}</TableCell>
                      <TableCell className="text-xs py-2">{row.batchId || '-'}</TableCell>
                      <TableCell className="text-xs py-2">
                        {row.fromDate ? format(new Date(row.fromDate), 'dd-MM-yyyy') : <span className="text-rose-500 font-mono text-[10px]">{row.fromDateStr || 'Empty'}</span>}
                      </TableCell>
                      <TableCell className="text-xs py-2">
                        {row.toDate ? format(new Date(row.toDate), 'dd-MM-yyyy') : <span className="text-rose-500 font-mono text-[10px]">{row.toDateStr || 'Empty'}</span>}
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground py-2 pr-4 max-w-[200px] truncate">
                        {row.error ? (
                          <span className="text-rose-400 flex items-center gap-1 font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            {row.error}
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-semibold">Ready</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Modal>
      )}

      {/* Roster Filters Grid */}
      <Card className="border border-border/80 bg-card shadow-sm rounded-2xl">
        <CardHeader className="p-5 pb-2 border-b border-border/40 flex flex-row items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-500" />
          <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground">Filter Certificates</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Student Name</label>
              <Input
                placeholder="Search by student name..."
                value={filterName}
                onChange={(e) => { setFilterName(e.target.value); setCurrentPage(1); }}
                className="h-9 text-xs rounded-xl bg-muted/40 border-border focus-visible:ring-indigo-500"
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Student ID / Registration ID</label>
              <Input
                placeholder="Search by student registration id..."
                value={filterStudentId}
                onChange={(e) => { setFilterStudentId(e.target.value); setCurrentPage(1); }}
                className="h-9 text-xs rounded-xl bg-muted/40 border-border focus-visible:ring-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Batch ID</label>
              <div className="relative">
                <Input
                  placeholder="Enter Batch ID..."
                  value={filterBatchId}
                  onChange={(e) => { setFilterBatchId(e.target.value); setCurrentPage(1); }}
                  className="h-9 text-xs rounded-xl bg-muted/40 border-border focus-visible:ring-indigo-500"
                  list="batch-suggestions"
                />
                <datalist id="batch-suggestions">
                  {uniqueBatchIds.map(b => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>
          
          {(filterName || filterStudentId || filterBatchId) && (
            <div className="flex justify-end mt-4">
              <Button
                onClick={clearFilters}
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 rounded-xl"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main List & Table */}
      <Card className="border border-border/80 bg-card shadow-sm rounded-2xl">
        <CardHeader className="p-5 pb-0 border-b border-border/40">
          <div className="flex items-center justify-between pb-4">
            <div>
              <CardTitle className="text-sm font-bold text-foreground">Certificate Roster</CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Showing {filteredCerts.length} of {certificates.length} certificates | {selectedIds.size} marked for export
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {paginatedCerts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="p-4 bg-muted rounded-full">
                <FileText className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">No certificates match your filters</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Clear search parameters or upload a new CSV file to display student records.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 border-b border-border/60">
                    <TableHead className="w-12 py-3 pl-6">
                      <button
                        onClick={handleToggleSelectAll}
                        className="text-muted-foreground hover:text-indigo-500 transition-colors cursor-pointer"
                      >
                        {isAllVisibleSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-500" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">Student ID</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">Student Name</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">Course / Training</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">Batch ID</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">From Date</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3">To Date</TableHead>
                    <TableHead className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground py-3 text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedCerts.map((cert) => {
                    const isSelected = selectedIds.has(cert.id);
                    return (
                      <TableRow 
                        key={cert.id} 
                        className={`hover:bg-muted/20 border-b border-border/40 transition duration-150 ${
                          isSelected ? 'bg-indigo-500/5' : ''
                        }`}
                      >
                        <TableCell className="py-3 pl-6">
                          <button
                            onClick={() => handleToggleSelectOne(cert.id)}
                            className="text-muted-foreground hover:text-indigo-500 transition-colors cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-500" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="text-xs font-semibold text-foreground py-3">{cert.studentId}</TableCell>
                        <TableCell className="text-xs font-bold text-foreground py-3">{cert.name}</TableCell>
                        <TableCell className="text-xs font-medium text-foreground py-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-indigo-500/10 text-indigo-500 font-bold dark:text-indigo-400">
                            {cert.course}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-bold text-foreground py-3">
                          {cert.batchId ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/10 text-emerald-600 font-bold dark:text-emerald-400">
                              {cert.batchId}
                            </span>
                          ) : (
                            <span className="italic text-muted-foreground/45 text-[10px]">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground py-3">{formatCertDate(cert.fromDate)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground py-3">{formatCertDate(cert.toDate)}</TableCell>
                        <TableCell className="py-3 text-right pr-6 space-x-1">
                          <Button
                            onClick={() => setSelectedCert(cert)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg cursor-pointer"
                            title="Preview Certificate"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handlePrint(cert)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                            title="Print / Save PDF"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => handleDownloadSinglePNG(cert)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-indigo-500 hover:bg-indigo-500/10 rounded-lg cursor-pointer"
                            title="Download PNG"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            onClick={() => setCertToDelete(cert.id)}
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                            title="Delete Certificate"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/40">
              <span className="text-[11px] text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold cursor-pointer"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                  className="text-xs font-semibold cursor-pointer"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Modal */}
      {selectedCert && (
        <Modal
          isOpen={!!selectedCert}
          onClose={() => setSelectedCert(null)}
          title="Certificate Live Preview"
          className="max-w-7xl sm:max-w-7xl w-full bg-card border-border text-foreground max-h-[95vh] overflow-y-auto"
        >
          <div className="space-y-4">
            <div className="border border-border/80 rounded-xl overflow-hidden bg-white/5 p-4 flex justify-center items-center h-[350px] sm:h-[450px] md:h-[550px] lg:h-[650px] xl:h-[800px]">
              {/* Dynamic Scaling Certificate View to fit nicely on different screens */}
              <div className="scale-[0.4] xs:scale-[0.5] sm:scale-[0.6] md:scale-[0.75] lg:scale-[0.9] xl:scale-100 origin-center shadow-2xl rounded-xl shrink-0 transition-transform duration-200">
                <div dangerouslySetInnerHTML={{ __html: getCertificateHTML(selectedCert) }} />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
              <Button
                onClick={() => setSelectedCert(null)}
                variant="outline"
                className="text-xs font-semibold cursor-pointer rounded-xl"
              >
                Close Preview
              </Button>
              <Button
                onClick={() => {
                  handlePrint(selectedCert);
                  setSelectedCert(null);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 mr-2" />
                Print Certificate
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {certToDelete && (
        <Modal
          isOpen={!!certToDelete}
          onClose={() => setCertToDelete(null)}
          title="Delete Certificate"
        >
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 text-rose-500 rounded-full">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Are you absolutely sure?</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  This will delete this certificate permanently from the database.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button
                onClick={() => setCertToDelete(null)}
                variant="outline"
                className="text-xs font-semibold cursor-pointer rounded-xl"
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleDelete}
                className="bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold rounded-xl cursor-pointer"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
