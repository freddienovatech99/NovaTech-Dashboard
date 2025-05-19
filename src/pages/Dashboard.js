  import { addDays } from "date-fns"; // Install date-fns if not already installed
  import { UserGroupIcon as UsersIcon, ArrowLeftOnRectangleIcon as LogoutIcon, BellIcon, ChartBarIcon, ClockIcon } from '@heroicons/react/24/outline';
  import React, { useState, useEffect, useMemo, useCallback } from "react";
  import { Link, useNavigate } from "react-router-dom";
  import jsPDF from 'jspdf';
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import { Bar } from "react-chartjs-2";
import {
  Chart,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
} from "chart.js";
import ErrorBoundary from './ErrorBoundary';
import JobForm from "./JobForm";
import OutsourceRepair from "./OutsourceRepair";
import { CheckIcon } from '@heroicons/react/24/outline';
import toast, { Toaster } from "react-hot-toast";
import 'react-toastify/dist/ReactToastify.css';

// Inside return() add this near the top:
<Toaster position="top-right" />


Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const STATUS_ICONS = {
  checking: "🔍",
  "waiting parts": "⏳",
  "waiting customer confirmation": "📩",
  "item fixed": "✅",
  "pending pick-up": "📦",
  done: "🏁",
  collected: "🛍️", 
  confiscated: "⚠️"
};

const STATUS_COLORS = {
  checking: "#fbbf24",
  "waiting parts": "#f59e0b",
  "waiting customer confirmation": "#f97316",
  "item fixed": "#10b981",
  "pending pick-up": "#3b82f6",
  done: "#22c55e",
  collected: "#6b7280",
  confiscated: "#ef4444",
};

const JOBS_PER_PAGE = 12;

const Toast = ({ text, type, onClose }) => (
  <div
    className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg shadow-lg text-white flex items-center justify-between gap-3 ${type === "success" ? "bg-green-600" :
        type === "error" ? "bg-red-600" : "bg-yellow-500"
      }`}
    role="alert"
    aria-live="assertive"
  >
    <span>{text}</span>
    <button
      onClick={onClose}
      className="text-white hover:text-gray-200"
      aria-label="Close notification"
    >
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </button>
  </div>
);

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-20" aria-label="Loading">
    <div className="w-12 h-12 border-t-2 border-b-2 border-blue-500 rounded-full animate-spin"></div>
  </div>
);

const StatusBadge = ({ status }) => (
  <span
    className="flex items-center gap-1 px-2 py-1 text-xs font-medium capitalize rounded"
    style={{ backgroundColor: STATUS_COLORS[status?.toLowerCase()] || "#6b7280" }}
    aria-label={`Status: ${status}`}
  >
    {STATUS_ICONS[status?.toLowerCase()] || "❓"} {status}
  </span>
);

const OutsourceStatusBadge = ({ jobId }) => {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    try {
      const records = JSON.parse(localStorage.getItem("nova_outsource_records")) || [];
      const record = records.find(r => r.jobId === jobId);
      setStatus(record?.returnStatus);
    } catch (error) {
      console.error("Error loading outsource status:", error);
    }
  }, [jobId]);

  if (!status) return null;

  return (
    <span className={`ml-2 px-2 py-1 rounded-full text-xs ${status === "Pending" ? "bg-yellow-600 text-yellow-100" :
        status === "Repaired" ? "bg-green-600 text-green-100" :
          status === "Returned" ? "bg-blue-600 text-blue-100" :
            "bg-gray-600 text-gray-100"
      }`}>
      Out: {status}
    </span>
  );
};

function Dashboard() {
  const [jobs, setJobs] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [role, setRole] = useState("intern");
  const [userEmail, setUserEmail] = useState("");
  const [search, setSearch] = useState("");
  const [dateSort, setDateSort] = useState("none");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [filterTechnician, setFilterTechnician] = useState("");
  const [toast, setToast] = useState({ text: "", type: "success", show: false });
  const [activityLog, setActivityLog] = useState([]);
  const [outsourceContext, setOutsourceContext] = useState({
    show: false,
    jobId: null,
    mode: 'view'
  });
  const [malaysiaTime, setMalaysiaTime] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [outsourceStats, setOutsourceStats] = useState({
    pending: 0,
    inProgress: 0,
    unpaid: 0
  });

  const navigate = useNavigate();

  useEffect(() => {
    const loadData = () => {
      try {
        const savedJobs = (JSON.parse(localStorage.getItem("nova_jobs")) || []).filter(j => j && typeof j === 'object');
        setJobs(savedJobs);

        const currentUser = JSON.parse(localStorage.getItem("nova_current_user")) ||
          JSON.parse(sessionStorage.getItem("nova_current_user")) || null;

        if (currentUser) {
          setRole(currentUser.role);
          setUserEmail(currentUser.email);
        } else {
          navigate("/auth");
        }

        const logs = JSON.parse(localStorage.getItem("nova_activity_log")) || [];
        toast("Settings saved!", {
  icon: "✅",
  style: {
    backgroundColor: "#16a34a",
    color: "white"
  }
});
        setActivityLog(logs);
        updateOutsourceStats();
      } catch (error) {
        showToast("Error loading data", "error");
        console.error("Data loading error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    const updateClock = () => {
      const now = new Date();
      const options = {
        timeZone: "Asia/Kuala_Lumpur",
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      };
      setMalaysiaTime(now.toLocaleString("en-MY", options));
    };

    const updateOutsourceStats = () => {
      try {
        const records = JSON.parse(localStorage.getItem("nova_outsource_records")) || [];
        setOutsourceStats({
          pending: records.filter(r => r.returnStatus === 'Pending').length,
          inProgress: records.filter(r => r.returnStatus === 'In Progress').length,
          unpaid: records.filter(r => r.paymentStatus !== 'Paid').length
        });
      } catch (error) {
        console.error("Error updating outsource stats:", error);
      }
    };

    loadData();
    updateClock();
    const interval = setInterval(updateClock, 1000);

    const handleOutsourceUpdate = () => {
      updateOutsourceStats();
    };

    window.addEventListener('outsourceUpdated', handleOutsourceUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('outsourceUpdated', handleOutsourceUpdate);
    };
  }, [navigate]);

  // New auto-confiscation system start
  useEffect(() => {
    const checkPickupDeadlines = () => {
      const now = new Date();
      const updatedJobs = jobs.map(job => {

        if (job.status === 'done' && !job.isConfiscated && job.status !== 'collected') {
          const pickupDeadline = new Date(job.pickupDeadline);
          const confiscationDate = new Date(job.confiscationDate);

          if (!job.notificationsSent?.initial) {
            sendNotification(job, 'initial');
            return {
              ...job,
              notificationsSent: { ...(job.notificationsSent || {}), initial: true }
            };
          }

          if (now > new Date(confiscationDate - 3 * 24 * 60 * 60 * 1000) &&
            !job.notificationsSent?.final) {
            sendNotification(job, 'final');
            return {
              ...job,
              notificationsSent: { ...job.notificationsSent, final: true }
            };
          }

          if (now > confiscationDate) {
            return {
              ...job,
              status: 'confiscated',
              isConfiscated: true,
              statusHistory: [
                ...(job.statusHistory || []),
                {
                  status: 'confiscated',
                  date: now.toISOString(),
                  changedBy: 'system'
                }
              ]
            };
          }
        }
        return job;
      });

      setJobs(updatedJobs);
      localStorage.setItem("nova_jobs", JSON.stringify(updatedJobs));
    };

    const interval = setInterval(checkPickupDeadlines, 3600000);
    return () => clearInterval(interval);
  }, [jobs]);

  const sendNotification = (job, type) => {
    const formatDate = (dateString) =>
      new Date(dateString).toLocaleDateString('en-MY', {
        timeZone: 'Asia/Kuala_Lumpur'
      });

    let message;
    switch (type) {
      case 'initial':
        message = `*NOVA TECH - ITEM READY*\n\n` +
          `Your ${job.device} is ready for pickup!\n` +
          `📍 Pickup Deadline: ${formatDate(job.pickupDeadline)}\n` +
          `⚠️ After 2 months (${formatDate(job.confiscationDate)}), ` +
          `unclaimed items will be confiscated.`;
        break;

      case 'final':
        message = `*FINAL WARNING - CONFISCATION NOTICE*\n\n` +
          `Your ${job.device} will be confiscated on ${formatDate(job.confiscationDate)}\n` +
          `❗ Last chance to collect before ${formatDate(job.confiscationDate)}`;
        break;
    }

    handleSendWhatsApp({ ...job, message });
    logAction(`Sent ${type} notification for job #${job.id}`);
  };
  // New auto-confiscation system end

  const showToast = useCallback((text, type = "success", duration = 3000) => {
    setToast({ text, type, show: true });
    const timer = setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, duration);
    return () => clearTimeout(timer);
  }, []);

  const logAction = useCallback((action) => {
    try {
      const newLog = {
        action,
        user: userEmail,
        time: new Date().toLocaleString("en-MY", {
          timeZone: "Asia/Kuala_Lumpur",
          hour12: true,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        timestamp: Date.now()
      };

      setActivityLog(prev => {
        const updated = [...prev, newLog].slice(-100);
        try {
          localStorage.setItem("nova_activity_log", JSON.stringify(updated));
        } catch (e) {
          console.error("Failed to save activity log:", e);
        }
        return updated;
      });
    } catch (error) {
      console.error("Error logging action:", error);
    }
  }, [userEmail]);

  const handleLogout = () => {
    logAction("Logged out");
    localStorage.removeItem("nova_current_user");
    sessionStorage.removeItem("nova_current_user");
    navigate("/auth");
  };

  const handleDeleteClick = (id) => {
    setJobToDelete(id);
    setShowConfirmModal(true);
  };

  const handleCollectItem = (jobId) => {
    const updatedJobs = jobs.map(job => {
      if (job.id === jobId) {
        return {
          ...job,
          status: 'collected',
          pickupDate: new Date().toISOString(),
          statusHistory: [
            ...(job.statusHistory || []), // Ensure statusHistory is an array
            {
              status: 'collected',
              date: new Date().toISOString(),
              changedBy: userEmail
            }
          ]
        };
      }
      return job;
    });

    setJobs(updatedJobs);
    localStorage.setItem("nova_jobs", JSON.stringify(updatedJobs));
    showToast("Item marked as collected", "success");
    logAction(`Marked job #${jobId} as collected`);
  };

  const confirmDelete = () => {
    try {
      const updatedJobs = jobs.filter((job) => job.id !== jobToDelete);
      setJobs(updatedJobs);
      localStorage.setItem("nova_jobs", JSON.stringify(updatedJobs));
      showToast("Job deleted successfully", "success");
      logAction(`Deleted job #${jobToDelete}`);
      setShowConfirmModal(false);
      setJobToDelete(null);
      setCurrentPage(1);
    } catch (error) {
      showToast("Failed to delete job", "error");
      console.error("Error deleting job:", error);
    }
  };

const handleExportPDF = async (job) => {
  try {
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPos = 20;

       // Header Section
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246); // Blue
    doc.text("NOVA TECH SERVICE REPORT", pageWidth / 2, yPos, { align: "center" });
    yPos += 10;
    
 // Job Details Table
    autoTable(doc, {
      startY: yPos,
      head: [["Service Details", ""]],
      body: [
        ["Job ID", job.id || "N/A"],
        ["Customer Name", job.name || "N/A"],
        ["Device", job.device || "N/A"],
        ["Status", job.status || "N/A"],
        ["Problem", job.problem || "N/A"],
        ["Accessories", job.accessories?.join(", ") || "None"]
      ],
      styles: { cellPadding: 5, fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255, fontSize: 12 },
      didDrawPage: (data) => {
        yPos = data.cursor.y + 15;
      }
    });

    // Terms and Conditions
    doc.setFontSize(14);
    doc.setTextColor(59, 130, 246); // Blue
    doc.text("TERMS AND CONDITIONS", margin, yPos);
    yPos += 10;

    doc.setDrawColor(200, 200, 200); // Light gray
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 12;

    const terms = [
      "1. 30-day warranty on repair workmanship.",
      "2. Customer responsible for data backup.",
      "3. Full payment required before device release.",
      "4. Not responsible for pre-existing conditions."
    ];

    terms.forEach((term) => {
      doc.setFontSize(10);
      doc.setTextColor(40, 40, 40);
      doc.text(term, margin, yPos);
      yPos += 6;
    });

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, margin, footerY);
    doc.text(`Page ${doc.getNumberOfPages()}`, pageWidth - margin, footerY, { align: "right" });

       // Save PDF
    doc.save(`NovaTech_Service_Report_${job.id || "report"}.pdf`);
    toast.success("PDF exported successfully!", {
      duration: 3000,
      position: "top-right"
    });

  } catch (error) {
    console.error("PDF generation failed:", error);
    toast.error("Failed to generate PDF", {
      duration: 3000,
      position: "top-right"
    });
  }
};
// Helper function to load image
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = reject;
  });
}

// Helper function to format date
function formatDate(date) {
  return new Date(date).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}
  const handleSendWhatsApp = (job) => {
    const number = `${job.countryCode || ""}${job.phone || ""}`.replace(/\D/g, "");
    if (!number) {
      showToast("No valid phone number found for this job", "error");
      return;
    }

    const message = job.message || `*NOVA TECH SERVICE UPDATE*\n\n` +
      `🔹 *Job ID:* ${job.id}\n` +
      `🔹 *Customer:* ${job.name || 'Not specified'}\n` +
      `🔹 *Device:* ${job.device || 'Not specified'}\n` +
      `🔹 *Status:* ${job.status || 'Not specified'}\n` +
      `🔹 *Problem:* ${job.problem || 'Not specified'}\n` +
      `🔹 *Accessories:* ${job.accessories?.join(", ") || "None"}\n\n` +
      `_Last updated: ${new Date(job.date || new Date()).toLocaleDateString()}_`;

    window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank");
    showToast("WhatsApp opened with job details", "success");
    logAction(`Sent job #${job.id} via WhatsApp`);
  };

  const handleExportAll = () => {
    try {
      const csvData = jobs.map(job => ({
        'Job ID': job.id,
        'Customer Name': job.name || '',
        'Phone': `${job.countryCode || ''}${job.phone || ''}`,
        'Device': job.device || '',
        'Status': job.status || '',
        'Problem': job.problem || '',
        'Accessories': job.accessories?.join(", ") || "",
        'Date': job.date || '',
        'Assigned To': job.assigned || "",
        'Technician Remark': job.remark || "",
        'Confiscation Date': job.isConfiscated ? job.confiscationDate : ""
      }));

      const csv = Papa.unparse(csvData, { header: true });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `NovaTech_Jobs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("All jobs exported to CSV", "success");
      logAction("Exported all jobs to CSV");
    } catch (error) {
      showToast("Failed to export jobs", "error");
      console.error("Export error:", error);
    }
  };

  const handleEdit = (job) => {
    setEditing(job);
    setShowForm(true);
    showToast(`Editing job #${job.id}`, "info");
    logAction(`Editing job #${job.id}`);
  };

  const handleViewJob = (job) => {
    setSelectedJob(job);
    setShowJobDetails(true);
    logAction(`Viewed details for job #${job.id}`);
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (!job || typeof job !== 'object') return false;

      if (fromDate || toDate) {
        const jobDate = new Date(job.date || new Date());
        const start = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date("1970-01-01");
        const end = toDate ? new Date(`${toDate}T23:59:59`) : new Date("2999-12-31");
        if (jobDate < start || jobDate > end) return false;
      }

      if (statusFilter && (!job.status || job.status.toLowerCase() !== statusFilter.toLowerCase())) {
        return false;
      }

      const searchTerm = search.toLowerCase();
      const searchFields = [
        job.name || '',
        job.device || '',
        job.status || '',
        job.problem || '',
        job.id?.toString() || ''
      ];

      if (!searchFields.some(field => field.toLowerCase().includes(searchTerm))) {
        return false;
      }

      if (filterTechnician && (!job.assigned || job.assigned.toLowerCase() !== filterTechnician.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [jobs, search, fromDate, toDate, statusFilter, filterTechnician]);

  const sortedJobs = useMemo(() => {
    if (dateSort === "asc") {
      return [...filteredJobs].sort((a, b) => new Date(a.date || new Date()) - new Date(b.date || new Date()));
    } else if (dateSort === "desc") {
      return [...filteredJobs].sort((a, b) => new Date(b.date || new Date()) - new Date(a.date || new Date()));
    }
    return filteredJobs;
  }, [filteredJobs, dateSort]);

  const currentJobs = useMemo(() => {
    const startIndex = (currentPage - 1) * JOBS_PER_PAGE;
    return sortedJobs.slice(startIndex, startIndex + JOBS_PER_PAGE);
  }, [sortedJobs, currentPage]);

  const clearFilters = () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setStatusFilter("");
    setFilterTechnician("");
    setDateSort("none");
    setCurrentPage(1);
    showToast("Filters cleared", "info");
  };

  const statusStats = useMemo(() => {
    return Object.keys(STATUS_COLORS).map(status => ({
      status,
      count: jobs.filter(j => j.status?.toLowerCase() === status).length,
      color: STATUS_COLORS[status]
    }));
  }, [jobs]);

  const OutsourceDetails = ({ jobId }) => {
    const [record, setRecord] = useState(null);

    useEffect(() => {
      try {
        const records = JSON.parse(localStorage.getItem("nova_outsource_records")) || [];
        setRecord(records.find(r => r.jobId === jobId));
      } catch (error) {
        console.error("Error loading outsource record:", error);
      }
    }, [jobId]);

    if (!record) return (
      <div className="pt-4 mt-4 border-t border-gray-700">
        <p className="text-sm text-gray-400">This job hasn't been outsourced</p>
        <button
          onClick={() => {
            setShowJobDetails(false);
            setOutsourceContext({
              show: true,
              jobId: jobId,
              mode: 'create'
            });
          }}
          className="px-3 py-1 mt-2 text-xs bg-purple-600 rounded hover:bg-purple-700"
        >
          Outsource This Job
        </button>
      </div>
    );

    return (
      <div className="pt-4 mt-4 border-t border-gray-700">
        <h4 className="mb-2 text-sm font-medium text-gray-400">Outsource Details</h4>
        <div className="p-3 rounded-lg bg-gray-700/50">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-400">Shop:</span> {record.shopName}
            </div>
            <div>
              <span className="text-gray-400">Status:</span>
              <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${record.returnStatus === "Pending" ? "bg-yellow-600 text-yellow-100" :
                  record.returnStatus === "Repaired" ? "bg-green-600 text-green-100" :
                    "bg-blue-600 text-blue-100"
                }`}>
                {record.returnStatus}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Cost:</span> RM {record.outsourceCost}
            </div>
            <div>
              <span className="text-gray-400">Payment:</span>
              <span className={record.paymentStatus === "Paid" ? "text-green-400" : "text-red-400"}>
                {record.paymentStatus}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setShowJobDetails(false);
              setOutsourceContext({
                show: true,
                jobId: jobId,
                mode: 'view'
              });
            }}
            className="w-full px-3 py-1 mt-3 text-xs bg-purple-600 rounded hover:bg-purple-700"
          >
            Manage Outsource
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen text-white bg-gray-900 bg-opacity-90"
      style={{
        backgroundImage: "url('/background.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}>
      <header className="sticky top-0 z-50 p-4 mb-6 border border-gray-700 rounded-lg shadow-2xl bg-gray-900/95 backdrop-blur-lg">
        {/* Subtler glowing border effect */}
        <div className="absolute inset-0 rounded-lg pointer-events-none bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse"></div>

        <div className="container flex flex-col items-center justify-between gap-4 mx-auto md:flex-row">
          <div className="flex items-center gap-4">
            {/* Logo with subtle hover effect */}
            <div className="relative group">
              <img
                src="/logo.png"
                alt="Nova Tech Logo"
                className="object-contain w-auto transition-all duration-300 h-14 group-hover:scale-105"
              />
              <div className="absolute inset-0 transition-opacity duration-500 rounded-full opacity-0 group-hover:opacity-30 bg-gradient-to-r from-blue-400 to-purple-500"></div>
            </div>
          
            <div>
              {/* Title with refined gradient */}
              <h1 className="text-2xl font-bold text-transparent md:text-3xl bg-clip-text bg-gradient-to-r from-blue-300 to-purple-400">
                Nova Tech Customer Database Managment
              </h1>
              
              <div className="flex items-center gap-2 mt-1">
                {/* User info */}
                <span className="text-sm text-gray-300 transition-colors md:text-base hover:text-blue-300">
                  {userEmail}
                </span>
                
                {/* Role badge */}
                <span className="px-3 py-1 text-sm uppercase transition-all border rounded-full border-blue-400/40 md:text-base bg-gradient-to-br from-blue-600/20 to-purple-600/20 backdrop-blur-sm hover:shadow-blue-400/20 hover:shadow-sm">
                  {role}
                </span>
                
                {/* Time display */}
                <span className="items-center hidden gap-1 text-sm text-gray-400 md:text-base md:flex group">
                  <span className="text-blue-400">🕒</span> 
                  <span className="font-mono transition-colors group-hover:text-cyan-300">
                    {malaysiaTime}
                  </span>
                </span>
              </div>
            </div>
          </div>
          

          <div className="flex items-center gap-3">
            {role === "owner" && (
              <Link
                to="/users"
                className="flex items-center gap-1 px-4 py-2 text-base text-white transition-all duration-200 bg-indigo-600 rounded-lg shadow hover:bg-indigo-700 hover:shadow-indigo-500/30 hover:-translate-y-0.5"
              >
                <UsersIcon className="w-5 h-5" />
                <span className="relative">
                  Manage Users
                  <span className="absolute bottom-0 left-0 w-0 h-px transition-all duration-300 bg-white group-hover:w-full"></span>
                </span>
              </Link>
            )}
            {role === "owner" && (
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to reset all jobs? This action cannot be undone.")) {
                    localStorage.removeItem("nova_jobs");
                    setJobs([]);
                    alert("All jobs have been reset.");
                  }
                }}
                className="px-4 py-2 text-base text-white transition-all duration-200 bg-red-600 rounded-lg shadow hover:bg-red-700 hover:shadow-red-500/30 hover:-translate-y-0.5"
              >
                <span className="relative">
                  Reset All Jobs
                  <span className="absolute bottom-0 left-0 w-0 h-px transition-all duration-300 bg-white group-hover:w-full"></span>
                </span>
              </button>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-4 py-2 text-base text-white transition-all duration-200 rounded-lg shadow bg-gradient-to-br from-red-600/90 to-pink-600/80 hover:from-red-700 hover:to-pink-700 hover:shadow-red-500/30 hover:-translate-y-0.5"
            >
              <LogoutIcon className="w-5 h-5" />
              <span className="relative">
                Logout
                <span className="absolute bottom-0 left-0 w-0 h-px transition-all duration-300 bg-white group-hover:w-full"></span>
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="container px-4 pb-10 mx-auto">
        <div className="p-4 mb-6 border border-gray-700 rounded-lg bg-gray-800/50">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
              <label htmlFor="search" className="block mb-1 text-xs text-gray-400">Search Jobs</label>
              <div className="relative">
                <input
                  id="search"
                  type="text"
                  placeholder="Search by name, device, status..."
                  className="w-full px-3 py-2 pr-8 text-white transition-all border border-gray-600 rounded bg-gray-700/80 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value.toLowerCase());
                    setCurrentPage(1);
                  }}
                />
                <svg className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div>
              <label htmlFor="fromDate" className="block mb-1 text-xs text-gray-400">From Date</label>
              <input
                id="fromDate"
                type="date"
                className="w-full px-3 py-2 text-white border border-gray-600 rounded bg-gray-700/80 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div>
              <label htmlFor="toDate" className="block mb-1 text-xs text-gray-400">To Date</label>
              <input
                id="toDate"
                type="date"
                className="w-full px-3 py-2 text-white border border-gray-600 rounded bg-gray-700/80 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <div>
              <label htmlFor="sort" className="block mb-1 text-xs text-gray-400">Sort By</label>
              <select
                id="sort"
                value={dateSort}
                onChange={(e) => {
                  setDateSort(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-white border border-gray-600 rounded bg-gray-700/80 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="none">Default</option>
                <option value="asc">Oldest First</option>
                <option value="desc">Newest First</option>
              </select>
            </div>

            <div>
              <label htmlFor="status" className="block mb-1 text-xs text-gray-400">Status</label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-white border border-gray-600 rounded bg-gray-700/80 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Status</option>
                {Object.keys(STATUS_COLORS).map(status => (
                  <option key={status} value={status}>
                    {STATUS_ICONS[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
                  </option>
                ))}
                <option value="collected">🛍️ Collected</option>
              </select>
            </div>

            <div>
              <label htmlFor="technician" className="block mb-1 text-xs text-gray-400">Technician</label>
              <select
                id="technician"
                value={filterTechnician}
                onChange={(e) => {
                  setFilterTechnician(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 text-white border border-gray-600 rounded bg-gray-700/80 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Technicians</option>
                {[...new Set(jobs.map(j => j.assigned).filter(Boolean))].map(tech => (
                  <option key={tech} value={tech}>{tech}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="flex items-center justify-center w-full gap-1 px-3 py-2 text-xs text-white transition-colors bg-gray-600 rounded shadow hover:bg-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {toast.show && (
          <Toast
            text={toast.text}
            type={toast.type}
            onClose={() => setToast(prev => ({ ...prev, show: false }))}
          />
        )}

        <div className="flex flex-col items-center justify-between gap-3 mb-6 sm:flex-row">
          <button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
            className="flex items-center justify-center w-full gap-2 px-4 py-2 text-sm text-white transition-colors bg-blue-600 rounded-lg shadow hover:bg-blue-700 sm:w-auto"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Job
          </button>

          <div className="flex w-full gap-3 sm:w-auto">
            <button
              onClick={handleExportAll}
              className="flex items-center justify-center w-full gap-2 px-4 py-2 text-sm text-white transition-colors bg-green-600 rounded-lg shadow hover:bg-green-700 sm:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export All (CSV)
            </button>

            <div className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-gray-700/80">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <span>{filteredJobs.length} jobs</span>
            </div>
          </div>
        </div>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {filteredJobs.length === 0 ? (
              <div className="py-16 text-center border border-gray-700 border-dashed rounded-lg col-span-full bg-gray-800/50">
                <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-300">No jobs found</h3>
                <p className="mt-2 text-gray-500">Try adjusting your search or filters</p>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 mt-4 text-sm text-white transition-colors bg-blue-600 rounded hover:bg-blue-700"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {currentJobs.map((job) => (
                    <div
                      key={job.id}
                      className="p-5 transition-all duration-300 border shadow-lg cursor-pointer bg-gray-800/70 hover:bg-gray-800/90 rounded-xl hover:shadow-xl border-gray-700/50"
                      onClick={() => handleViewJob(job)}
                      role="button"
                      tabIndex="0"
                      aria-label={`View details for job ${job.id}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h2 className="text-xl font-bold text-blue-400">#{job.id}</h2>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={job.status} />
                          <OutsourceStatusBadge jobId={job.id} />
                        </div>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">👤</span>
                          <span className="font-medium">{job.name}</span>
                        </div>

                        <div className="flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">📱</span>
                          <span>{job.device}</span>
                        </div>

                        <div className="flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">🔧</span>
                          <span className="line-clamp-2">{job.problem}</span>
                        </div>

                        <div className="flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">📅</span>
                          <span>{new Date(job.date).toLocaleDateString()}</span>
                        </div>

                        <div className="flex items-start gap-2">
                          <span className="text-gray-400 mt-0.5">👨‍🔧</span>
                          <span>{job.assigned || "Unassigned"}</span>
                        </div>

                        {job.photo && (
                          <div className="mt-3">
                            <img
                              src={job.photo}
                              alt="Device"
                              className="object-cover w-full transition-opacity border rounded-lg h-36 border-gray-700/50 hover:opacity-90"
                              onClick={(e) => {
                                e.stopPropagation();
                                window.open(job.photo, '_blank');
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Confiscation Warning Start */}

                      {job.status === 'collected' && (
                        <div className="p-2 mt-2 text-xs border rounded bg-green-900/30 border-green-800/50">
                          <div className="flex items-center gap-1 text-green-400">
                            <CheckIcon className="w-4 h-4" />
                            <span>COLLECTED - {new Date(job.pickupDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      )}

                      {job.status === 'done' && !job.isConfiscated && (
                        <div className="p-2 mt-2 text-xs border rounded bg-yellow-900/30 border-yellow-800/50">
                          <div className="flex items-center gap-1">
                            <span>⏳ Pickup by: {new Date(job.pickupDeadline).toLocaleDateString()}</span>
                          </div>
                          <div className="mt-1 text-yellow-500">
                            {new Date() > new Date(job.pickupDeadline) ? (
                              <span>⚠️ Confiscation on: {new Date(job.confiscationDate).toLocaleDateString()}</span>
                            ) : (
                              <span>❗ After 7 days: Storage fees apply</span>
                            )}
                          </div>
                        </div>
                      )}

                      {job.isConfiscated && (
                        <div className="p-2 mt-2 text-xs border rounded bg-red-900/30 border-red-800/50">
                          <div className="flex items-center gap-1 text-red-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            <span>CONFISCATED - {new Date(job.confiscationDate).toLocaleDateString()}</span>
                          </div>
                        </div>
                      )}
                      {/* Confiscation Warning End */}

                      <div className="pt-3 mt-4 border-t border-gray-700/50">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportPDF(job);
                            }}
                            className="flex items-center gap-1 bg-green-600/90 hover:bg-green-600 px-3 py-1.5 rounded-lg text-xs shadow transition-colors"
                            aria-label={`Export PDF for job ${job.id}`}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                            PDF
                          </button>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSendWhatsApp(job);
                            }}
                            className="flex items-center gap-1 bg-teal-600/90 hover:bg-teal-600 px-3 py-1.5 rounded-lg text-xs shadow transition-colors"
                            aria-label={`Send WhatsApp for job ${job.id}`}
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            WhatsApp
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCollectItem(job.id);
                            }}
                            className="flex items-center gap-1 bg-green-600/90 hover:bg-green-600 px-3 py-1.5 rounded-lg text-xs shadow transition-colors"
                            aria-label={`Mark job #${job.id} as collected`}
                          >
                            <CheckIcon className="h-3.5 w-3.5" />
                            Collected
                          </button>


                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOutsourceContext({
                                show: true,
                                jobId: job.id,
                                mode: 'view'
                              });
                            }}
                            className="flex items-center gap-1 bg-purple-600/90 hover:bg-purple-600 px-3 py-1.5 rounded-lg text-xs shadow transition-colors"
                            aria-label={`Outsource details for job ${job.id}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            Outsource
                          </button>

                          {role !== "intern" && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(job);
                                }}
                                className="flex items-center gap-1 bg-yellow-500/90 hover:bg-yellow-500 px-3 py-1.5 rounded-lg text-xs shadow transition-colors"
                                aria-label={`Edit job ${job.id}`}
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(job.id);
                                }}
                                className="flex items-center gap-1 bg-red-600/90 hover:bg-red-600 px-3 py-1.5 rounded-lg text-xs shadow transition-colors"
                                aria-label={`Delete job ${job.id}`}
                              >
                                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredJobs.length > JOBS_PER_PAGE && (
                  <div className="flex justify-center mt-8">
                    <nav className="flex items-center gap-2" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-4 py-2 text-sm transition-colors border border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-700"
                        aria-label="Previous page"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Previous
                      </button>

                      {Array.from({ length: Math.ceil(filteredJobs.length / JOBS_PER_PAGE) }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setCurrentPage(i + 1)}
                          className={`px-4 py-2 rounded-lg text-sm ${currentPage === i + 1
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'border border-gray-600 hover:bg-gray-700'
                            } transition-colors`}
                          aria-label={`Page ${i + 1}`}
                          aria-current={currentPage === i + 1 ? "page" : undefined}
                        >
                          {i + 1}
                        </button>
                      ))}

                      <button
                        onClick={() => setCurrentPage(p => Math.min(p + 1, Math.ceil(filteredJobs.length / JOBS_PER_PAGE)))}
                        disabled={currentPage === Math.ceil(filteredJobs.length / JOBS_PER_PAGE)}
                        className="flex items-center gap-1 px-4 py-2 text-sm transition-colors border border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-700"
                        aria-label="Next page"
                      >
                        Next
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                )}
              </>
            )}

            <div className="grid grid-cols-1 gap-6 mt-12 lg:grid-cols-3">
              <div className="p-6 border border-gray-700 shadow bg-gray-800/50 rounded-xl">
                <h2 className="flex items-center gap-2 mb-4 text-lg font-semibold text-blue-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Job Status Distribution
                </h2>
                <div className="h-64">
                  <Bar
                    data={{
                      labels: statusStats.map(s => s.status),
                      datasets: [{
                        label: "Job Count",
                        data: statusStats.map(s => s.count),
                        backgroundColor: statusStats.map(s => s.color),
                        borderColor: "#1f2937",
                        borderWidth: 1,
                        borderRadius: 4
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: '#1f2937',
                          titleColor: '#ffffff',
                          bodyColor: '#e5e7eb',
                          borderColor: '#4b5563',
                          borderWidth: 1,
                          padding: 10,
                          displayColors: true,
                          callbacks: {
                            label: (context) => {
                              return `${context.parsed.y} jobs (${Math.round((context.parsed.y / jobs.length) * 100)}%)`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: {
                            color: '#374151',
                            drawBorder: false
                          },
                          ticks: {
                            color: '#9ca3af',
                            stepSize: 1
                          }
                        },
                        x: {
                          grid: {
                            display: false,
                            drawBorder: false
                          },
                          ticks: {
                            color: '#9ca3af'
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="p-6 border border-gray-700 shadow bg-gray-800/50 rounded-xl">
                <h2 className="flex items-center gap-2 mb-4 text-lg font-semibold text-purple-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Outsource Summary
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 text-center rounded-lg bg-gray-700/50">
                    <div className="text-2xl font-bold text-yellow-400">{outsourceStats.pending}</div>
                    <div className="text-xs text-gray-400">Pending</div>
                  </div>
                  <div className="p-3 text-center rounded-lg bg-gray-700/50">
                    <div className="text-2xl font-bold text-blue-400">{outsourceStats.inProgress}</div>
                    <div className="text-xs text-gray-400">In Progress</div>
                  </div>
                  <div className="p-3 text-center rounded-lg bg-gray-700/50">
                    <div className="text-2xl font-bold text-red-400">{outsourceStats.unpaid}</div>
                    <div className="text-xs text-gray-400">Unpaid</div>
                  </div>
                </div>
              </div>

              <div className="p-6 border border-gray-700 shadow bg-gray-800/50 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-blue-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Recent Activity
                  </h2>
                  <span className="px-2 py-1 text-xs bg-gray-700 rounded-full">
                    {activityLog.length} total activities
                  </span>
                </div>
                <div className="pr-2 overflow-y-auto max-h-80">
                  <div className="space-y-3">
                    {activityLog.slice().reverse().slice(0, 8).map((log, idx) => (
                      <div
                        key={`${log.timestamp}-${idx}`}
                        className="p-3 transition-colors rounded-lg bg-gray-700/50 hover:bg-gray-700/70"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="bg-gray-600/50 p-1.5 rounded-full">
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium">{log.user}</p>
                              <p className="text-xs text-gray-400">{log.action}</p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-400">{log.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {activityLog.length > 8 && (
                  <button
                    onClick={() => setShowJobDetails(false)}
                    className="mt-3 text-xs text-blue-400 hover:text-blue-300"
                  >
                    View all activities →
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <ErrorBoundary></ErrorBoundary>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-2xl p-6 bg-gray-800 border border-gray-700 shadow-xl rounded-xl">
            <JobForm
              onSave={(newJob) => {
                try {
                  const updatedJobs = editing
                    ? jobs.map(j => j.id === editing.id ? {
                      ...newJob,
                      doneDate: newJob.status === 'done' ? new Date().toISOString() : null,
                      pickupDeadline: newJob.status === 'done'
                        ? addDays(new Date(), 7).toISOString() // Add 7 days for pickup deadline
                        : null,
                      confiscationDate: newJob.status === 'done'
                        ? addDays(new Date(), 60).toISOString() // Add 60 days for confiscation
                        : null,
                      notificationsSent: { initial: false, final: false },
                      isConfiscated: false
                    } : j)
                    : [...jobs, {
                      ...newJob,
                      id: Date.now().toString(),
                      date: new Date().toISOString(),
                      doneDate: newJob.status === 'done' ? new Date().toISOString() : null,
                      pickupDeadline: newJob.status === 'done'
                        ? addDays(new Date(), 7).toISOString()
                        : null,
                      confiscationDate: newJob.status === 'done'
                        ? addDays(new Date(), 60).toISOString()
                        : null,
                      notificationsSent: { initial: false, final: false },
                      isConfiscated: false
                    }];

                  if (newJob.status === 'done') {
                    sendNotification(newJob, 'initial');
                  }

                  setJobs(updatedJobs);
                  localStorage.setItem("nova_jobs", JSON.stringify(updatedJobs));
                  setShowForm(false);
                  setEditing(null);
                  setCurrentPage(1);
                  showToast(
                    editing ? "Job updated successfully" : "Job created successfully",
                    "success"
                  );
                  logAction(
                    editing ? `Updated job #${editing.id}` : "Created new job"
                  );
                } catch (error) {
                  showToast("Failed to save job", "error");
                  console.error("Error saving job:", error);
                }
              }}
              editData={editing}
              role={role}
              onClose={() => {
                setShowForm(false);
                setEditing(null);
              }}
            />
          </div>
        </div>
      )}
      <ErrorBoundary></ErrorBoundary>
      {outsourceContext.show && (
        <OutsourceRepair
          jobId={outsourceContext.jobId}
          customer={outsourceContext.customer}
          device={outsourceContext.device}
          problem={outsourceContext.problem}
          accessories={outsourceContext.accessories}
          jobDate={outsourceContext.jobDate}
          technician={outsourceContext.technician}
          onClose={() => setOutsourceContext({ show: false })}
          onSuccess={() => { /* Handle success */ }}
        />
      )}

      {showJobDetails && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-gray-800 rounded-xl shadow-xl p-6 max-w-2xl w-full border border-gray-700 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-blue-400">Job Details #{selectedJob.id}</h3>
              <button
                onClick={() => setShowJobDetails(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Close job details"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h4 className="mb-1 text-sm font-medium text-gray-400">Customer Information</h4>
                  <div className="p-4 rounded-lg bg-gray-700/50">
                    <p className="font-medium">{selectedJob.name}</p>
                    <p className="mt-1 text-sm text-gray-300">
                      {selectedJob.countryCode || ''}{selectedJob.phone || 'No phone provided'}
                    </p>
                    {selectedJob.email && (
                      <p className="mt-1 text-sm text-gray-300">{selectedJob.email}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="mb-1 text-sm font-medium text-gray-400">Device Information</h4>
                  <div className="p-4 rounded-lg bg-gray-700/50">
                    <p className="font-medium">{selectedJob.device}</p>
                    <p className="mt-2 text-sm text-gray-300">
                      <span className="font-medium">Problem:</span> {selectedJob.problem}
                    </p>
                    <p className="mt-1 text-sm text-gray-300">
                      <span className="font-medium">Accessories:</span> {selectedJob.accessories?.join(", ") || "None"}
                    </p>
                  </div>
                </div>

                {selectedJob.photo && (
                  <div>
                    <h4 className="mb-1 text-sm font-medium text-gray-400">Device Photo</h4>
                    <img
                      src={selectedJob.photo}
                      alt="Device"
                      className="object-contain w-full h-48 border border-gray-700 rounded-lg cursor-pointer"
                      onClick={() => window.open(selectedJob.photo, '_blank')}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="mb-1 text-sm font-medium text-gray-400">Repair Details</h4>
                  <div className="p-4 rounded-lg bg-gray-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <StatusBadge status={selectedJob.status} />
                      <span className="text-sm text-gray-300">
                        {new Date(selectedJob.date).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-gray-300">
                      <span className="font-medium">Assigned To:</span> {selectedJob.assigned || "Unassigned"}
                    </p>

                    <p className="mt-2 text-sm text-gray-300">
                      <span className="font-medium">Source:</span> {selectedJob.source || "Unknown"}
                    </p>

                    {selectedJob.remark && (
                      <div className="pt-3 mt-3 border-t border-gray-700">
                        <p className="text-sm font-medium text-gray-400">Technician Notes:</p>
                        <p className="mt-1 text-sm text-yellow-300">{selectedJob.remark}</p>
                      </div>
                    )}
                  </div>
                </div>

                <OutsourceDetails jobId={selectedJob.id} />

                <div>
                  <h4 className="mb-1 text-sm font-medium text-gray-400">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleExportPDF(selectedJob)}
                      className="flex flex-col items-center justify-center gap-1 p-2 text-xs transition-colors bg-green-600 rounded hover:bg-green-700"
                      aria-label={`Export PDF for job ${selectedJob.id}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      Export PDF
                    </button>

                    <button
                      onClick={() => handleSendWhatsApp(selectedJob)}
                      className="flex flex-col items-center justify-center gap-1 p-2 text-xs transition-colors bg-teal-600 rounded hover:bg-teal-700"
                      aria-label={`Send WhatsApp for job ${selectedJob.id}`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      WhatsApp
                    </button>

                    {role !== "intern" && (
                      <>
                        <button
                          onClick={() => {
                            setShowJobDetails(false);
                            handleEdit(selectedJob);
                          }}
                          className="flex flex-col items-center justify-center gap-1 p-2 text-xs transition-colors bg-yellow-500 rounded hover:bg-yellow-600"
                          aria-label={`Edit job ${selectedJob.id}`}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button>

                        <button
                          onClick={() => {
                            setShowJobDetails(false);
                            handleDeleteClick(selectedJob.id);
                          }}
                          className="flex flex-col items-center justify-center gap-1 p-2 text-xs transition-colors bg-red-600 rounded hover:bg-red-700"
                          aria-label={`Delete job ${selectedJob.id}`}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

<footer className="border-t border-gray-800 bg-gradient-to-b from-gray-900/50 to-gray-900/80 backdrop-blur-md">
  <div className="container px-6 py-8 mx-auto">
    {/* Glowing top accent */}
    <div className="h-px mx-auto mb-8 bg-gradient-to-r from-transparent via-blue-500/40 to-transparent"></div>
    
    <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
      {/* System Status */}
      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wider text-blue-400 uppercase">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          System Status
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
            <span className="text-gray-300">Dashboard</span>
            <span className="flex items-center gap-1 text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Operational
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
            <span className="text-gray-300">Database</span>
            <span className="flex items-center gap-1 text-green-400">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              Nominal
            </span>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-gray-700/50">
            <span className="text-gray-300">Version</span>
            <span className="font-mono text-blue-300">v2.4.8</span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="flex items-center gap-2 mb-4 text-sm font-semibold tracking-wider text-purple-400 uppercase">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Quick Links
        </h3>
        <ul className="space-y-2">
          <li>
            <Link to="/dashboard" className="text-gray-400 transition-colors hover:text-blue-300">
              Dashboard
            </Link>
          </li>
          <li>
            <Link to="/analytics" className="text-gray-400 transition-colors hover:text-blue-300">
              Analytics
            </Link>
          </li>
          <li>
            <a href="#" className="text-gray-400 transition-colors hover:text-blue-300">
              Documentation
            </a>
          </li>
        </ul>
      </div>

      {/* Contact */}
      <div>
        <h3 className="flex items-center gap-2 mb-4 text-sm font-semibold tracking-wider text-pink-400 uppercase">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Contact
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-400 transition-colors hover:text-blue-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            +60 17-8106634
          </div>
          <div className="flex items-center gap-2 text-gray-400 transition-colors hover:text-blue-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            novatechserviceandrepair@gmail.com
          </div>
          <div className="flex items-center gap-2 text-gray-400 transition-colors hover:text-blue-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            BLOCK H-0-15, GROUND FLOOR, LOT 55, SURIA INANAM, JLN TUARAN BYPASS INANAM LAUT,88450 KOTA KINABALU.
             (𝙊𝙐𝙍 𝙎𝙃𝙊𝙋 𝙄𝙎 𝘼𝙏 𝙂𝙍𝙊𝙐𝙉𝘿 𝙁𝙇𝙊𝙊𝙍)
          </div>
        </div>
        <div className="flex gap-4 mt-4">
          <a href="#" className="p-2 text-gray-400 transition-all rounded-full hover:text-white hover:bg-blue-500/20 hover:scale-110">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
            </svg>
          </a>
          <a href="#" className="p-2 text-gray-400 transition-all rounded-full hover:text-white hover:bg-purple-500/20 hover:scale-110">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
          <a href="#" className="p-2 text-gray-400 transition-all rounded-full hover:text-white hover:bg-red-500/20 hover:scale-110">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
            </svg>
          </a>
        </div>
      </div>
    </div>

    {/* Bottom glow and copyright */}
    <div className="h-px mx-auto mt-8 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
    <div className="mt-6 text-center">
      <p className="text-xs text-gray-500">
        © {new Date().getFullYear()} Nova Tech. All rights reserved.
      </p>
      <p className="mt-1 text-xs text-gray-600">
        Designed with ❤️ for the future of device repair
      </p>
    </div>
  </div>
</footer>

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="w-full max-w-md p-6 bg-gray-800 border border-gray-700 shadow-xl rounded-xl">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-red-400">Confirm Deletion</h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-gray-400 hover:text-white"
                aria-label="Close confirmation dialog"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="mb-6 text-gray-300">
              Are you sure you want to permanently delete job #{jobToDelete}? This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-white transition-colors border border-gray-600 rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex items-center gap-1 px-4 py-2 text-white transition-colors bg-red-600 rounded-lg hover:bg-red-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

Dashboard.propTypes = {
  // PropTypes remain unchanged
};
export default Dashboard;