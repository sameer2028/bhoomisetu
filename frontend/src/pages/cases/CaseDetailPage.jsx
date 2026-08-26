import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import {
  GitBranch,
  ArrowLeft,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  User,
  FolderKanban,
  MapPin,
  Calendar,
  ChevronRight,
  ArrowRightCircle,
  RotateCcw,
  XCircle,
  MessageSquare,
  Shield,
  X,
  BookOpen,
  FileText,
  ListChecks,
  Scale,
  FileCheck,
  Info,
  Download,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

const STAGE_LABELS = {
  PROJECT_PROPOSAL: 'Project Proposal',
  LAND_IDENTIFICATION: 'Land Identification',
  VERIFICATION: 'Verification',
  APPROVAL: 'Approval',
  NOTIFICATION: 'Notification',
  COMPENSATION: 'Compensation',
  AWARD: 'Award',
  PAYMENT: 'Payment',
  POSSESSION: 'Possession',
  RR: 'R&R',
  CLOSURE: 'Closure',
};

const STAGE_DOCUMENTATION = {
  PROJECT_PROPOSAL: {
    step: 1,
    title: 'Project Proposal',
    legalRef: 'Section 4(1) - Preliminary Land Requirement Proposal',
    summary: 'The requiring department (e.g. NHAI, PWD, Water Resources) submits a formal land acquisition proposal defining project objectives, layout map, estimated land area, and initial funding authorization.',
    keyTasks: [
      'Submission of formal proposal by Requiring Body',
      'Preliminary scope & corridor width validation',
      'Assignment of case code & District Land Acquisition Officer (DLAO)',
      'Budget & administrative feasibility assessment',
    ],
    documentsRequired: ['Project Plan / DPR', 'Administrative Sanction Order', 'Proposed Corridor Alignment Map'],
    proofDocuments: [
      {
        code: 'DOC-PROP-001',
        title: 'Detailed Project Report (DPR) & Layout Map',
        type: 'Project Plan',
        verified: true,
        verifier: 'NHAI Infrastructure Authority',
        date: '2026-08-01',
        size: '4.2 MB',
        file: 'DPR_Sanction_Order_PRJ2026.pdf',
      },
      {
        code: 'DOC-PROP-002',
        title: 'Administrative Sanction & Budget Clearance',
        type: 'Sanction Order',
        verified: true,
        verifier: 'Ministry of Road Transport & Highways',
        date: '2026-08-05',
        size: '1.8 MB',
        file: 'Admin_Sanction_Clearance.pdf',
      },
    ],
  },
  LAND_IDENTIFICATION: {
    step: 2,
    title: 'Land Identification & Earmarking',
    legalRef: 'Section 4(2) & GIS Cadastral Overlay',
    summary: 'Surveyors earmark specific survey plot numbers, village boundaries, and plot geometry linked directly from the cadastral GIS database to the acquisition case file.',
    keyTasks: [
      'Earmarking plot survey numbers & village khata records',
      'GIS cadastral boundary alignment check',
      'Identification of government vs. private land plots',
      'Social Impact Assessment (SIA) preliminary scoping',
    ],
    documentsRequired: ['Cadastral Maps (Khasra Map)', 'Survey Plot Earmarking List', 'SIA Team Notification'],
    proofDocuments: [
      {
        code: 'DOC-ID-001',
        title: 'GIS Cadastral Khasra Map Overlay Proof',
        type: 'GIS Boundary Map',
        verified: true,
        verifier: 'District Survey Department',
        date: '2026-08-10',
        size: '6.5 MB',
        file: 'Cadastral_Khasra_Overlay_Map.pdf',
      },
      {
        code: 'DOC-ID-002',
        title: 'Survey Plot Earmarking & Area Schedule',
        type: 'Plot Schedule',
        verified: true,
        verifier: 'Senior Surveyor Officer',
        date: '2026-08-12',
        size: '2.1 MB',
        file: 'Plot_Earmarking_Schedule.pdf',
      },
    ],
  },
  VERIFICATION: {
    step: 3,
    title: 'Ground & Revenue Verification',
    legalRef: 'Section 8 & Revenue Title Verification (Bhulekh)',
    summary: 'Field Revenue Officers (FRO) conduct physical site inspections and verify land ownership titles against state revenue databases to detect ownership errors or encumbrances.',
    keyTasks: [
      'Field inspection of physical plot boundaries',
      'Title record matching against State Revenue Portal (Bhulekh)',
      'Verification of encumbrances, mortgages, or legal disputes',
      'Identification of standing crops, trees, and structures',
    ],
    documentsRequired: ['Field Verification Report', 'Title Ownership Extract (Khatauni)', 'Encumbrance Certificate'],
    proofDocuments: [
      {
        code: 'DOC-VER-001',
        title: 'Field Verification & Ground Title Match Report',
        type: 'Inspection Report',
        verified: true,
        verifier: 'Amit Kumar Verma (Field Revenue Officer)',
        date: '2026-08-15',
        size: '3.4 MB',
        file: 'Field_Revenue_Inspection_Report.pdf',
      },
      {
        code: 'DOC-VER-002',
        title: 'Bhulekh Revenue Extract (Verified Khatauni Record)',
        type: 'Title Record',
        verified: true,
        verifier: 'Tehsildar Revenue Office',
        date: '2026-08-16',
        size: '1.2 MB',
        file: 'Verified_Khatauni_Extract.pdf',
      },
    ],
  },
  APPROVAL: {
    step: 4,
    title: 'Competent Authority Approval',
    legalRef: 'Section 8(3) - Collector Administrative Sanction',
    summary: 'The District Collector / Senior Government Authority (SGA) reviews verified field reports, SIA recommendations, and grants administrative approval to proceed with statutory acquisition.',
    keyTasks: [
      'Multi-departmental review by Competent Authority',
      'Examination of Social Impact Assessment report',
      'Approval of land acquisition proposal',
      'Authorization for Gazette notification publication',
    ],
    documentsRequired: ['Collector Approval Order', 'SIA Committee Clearance', 'Financial Clearance Certificate'],
    proofDocuments: [
      {
        code: 'DOC-APP-001',
        title: 'District Collector Administrative Sanction Order',
        type: 'Approval Sanction Order',
        verified: true,
        verifier: 'Dr. Vikramaditya Singh (SGA / District Magistrate)',
        date: '2026-08-18',
        size: '2.9 MB',
        file: 'Collector_Administrative_Sanction.pdf',
      },
      {
        code: 'DOC-APP-002',
        title: 'Social Impact Assessment (SIA) Committee Clearance',
        type: 'SIA Clearance',
        verified: true,
        verifier: 'State Land Acquisition Directorate',
        date: '2026-08-19',
        size: '5.1 MB',
        file: 'SIA_Clearance_Certificate.pdf',
      },
    ],
  },
  NOTIFICATION: {
    step: 5,
    title: 'Statutory Gazette Notification & Objections',
    legalRef: 'RFCTLARR Act 2013 — Section 11, Section 15 & Section 19',
    summary: 'Issuance of Section 11 preliminary notice in Official Gazette & 2 local newspapers, placing a legal freeze on land sales, followed by 60-day public objection hearings (Section 15) and Section 19 acquisition declaration.',
    keyTasks: [
      'Publication of Sec 11 preliminary notice in Official Gazette & 2 local newspapers',
      'Legal freeze placed on land transfers & new building permissions',
      'Conducting 60-day public objection hearings (Section 15)',
      'Issuance of Section 19 Declaration of Acquisition',
    ],
    documentsRequired: ['Official Gazette Copy (Sec 11)', 'Newspaper Publication Scans', 'Public Hearing Minutes', 'Section 19 Declaration Order'],
    proofDocuments: [
      {
        code: 'DOC-NOT-001',
        title: 'Official Government Gazette Copy (Section 11 Preliminary Notice)',
        type: 'Gazette Notification',
        verified: true,
        verifier: 'State Printing & Gazette Press',
        date: '2026-08-20',
        size: '3.8 MB',
        file: 'Gazette_Notification_Sec11.pdf',
      },
      {
        code: 'DOC-NOT-002',
        title: 'Newspaper Publication Scans (Dainik Jagran & Times of India)',
        type: 'Public Press Notice',
        verified: true,
        verifier: 'District Information Office',
        date: '2026-08-21',
        size: '4.5 MB',
        file: 'Newspaper_Scans_PublicNotice.pdf',
      },
      {
        code: 'DOC-NOT-003',
        title: 'Section 15 Objections Hearing Proceedings & Minutes',
        type: 'Hearing Minutes',
        verified: true,
        verifier: 'Rajesh Sharma (DLAO)',
        date: '2026-08-24',
        size: '2.7 MB',
        file: 'Sec15_Hearing_Objection_Minutes.pdf',
      },
      {
        code: 'DOC-NOT-004',
        title: 'Section 19 Final Acquisition Declaration Gazette Order',
        type: 'Final Declaration',
        verified: true,
        verifier: 'Collector & Competent Authority',
        date: '2026-08-25',
        size: '3.2 MB',
        file: 'Sec19_Acquisition_Declaration.pdf',
      },
    ],
  },
  COMPENSATION: {
    step: 6,
    title: 'Valuation & Compensation Assessment',
    legalRef: 'Section 26-30 - Market Value & 100% Solatium Assessment',
    summary: 'Detailed assessment of land market values, 100% Solatium, standing crops, structures, and trees to calculate the total statutory compensation payable per affected landowner.',
    keyTasks: [
      'Calculation of circle rates & recent sales deeds average',
      'Assessment of 100% Solatium & 12% per annum interest',
      'Valuation of standing crops, trees, and buildings by PWD/Forest experts',
      'Finalization of individual landowner compensation sheets',
    ],
    documentsRequired: ['Market Value Calculation Sheet', 'PWD Structure Valuation Report', 'Solatium Assessment Record'],
    proofDocuments: [
      {
        code: 'DOC-COMP-001',
        title: 'Statutory Land Market Valuation & Solatium Assessment Sheet',
        type: 'Valuation Sheet',
        verified: true,
        verifier: 'District Land Valuation Committee',
        date: '2026-08-26',
        size: '3.9 MB',
        file: 'Valuation_Solatium_Sheet.pdf',
      },
      {
        code: 'DOC-COMP-002',
        title: 'PWD Structural & Assets Damage Valuation Proof',
        type: 'Asset Assessment',
        verified: true,
        verifier: 'Public Works Dept Executive Engineer',
        date: '2026-08-26',
        size: '2.3 MB',
        file: 'PWD_Structural_Valuation.pdf',
      },
    ],
  },
  AWARD: {
    step: 7,
    title: 'Land Acquisition Award Declaration',
    legalRef: 'Section 37 - Collector Award Order',
    summary: 'The Collector / LAO passes the formal Land Acquisition Award Order declaring final compensation amounts, total land area acquired, and individual beneficiary entitlement lists.',
    keyTasks: [
      'Passing of formal statutory Land Acquisition Award Order',
      'Publication of beneficiary entitlement list',
      'Service of notice to landowners to receive payment',
      'Filing of award copy in revenue archives',
    ],
    documentsRequired: ['Formal Award Order (Section 37)', 'Beneficiary Compensation Roll', 'Notice to Landowners'],
    proofDocuments: [
      {
        code: 'DOC-AWD-001',
        title: 'Collector Statutory Land Award Order (Section 37)',
        type: 'Award Order',
        verified: true,
        verifier: 'Collectorate Judicial Seal',
        date: '2026-08-26',
        size: '4.8 MB',
        file: 'Collector_Award_Order_Sec37.pdf',
      },
      {
        code: 'DOC-AWD-002',
        title: 'Beneficiary Entitlement Compensation Roll',
        type: 'Beneficiary Roll',
        verified: true,
        verifier: 'Land Acquisition Accountant',
        date: '2026-08-26',
        size: '1.9 MB',
        file: 'Beneficiary_Entitlement_Roll.pdf',
      },
    ],
  },
  PAYMENT: {
    step: 8,
    title: 'Direct Compensation Disbursement',
    legalRef: 'Section 77 - Payment of Compensation & Tribunal Deposit',
    summary: 'Direct Bank Transfer (DBT) of approved compensation into verified bank accounts of landowners or deposit into the Land Acquisition Tribunal for disputed titles.',
    keyTasks: [
      'Aadhaar & Bank Account verification of beneficiaries',
      'Direct Bank Transfer (DBT) payment processing',
      'Deposit of compensation for disputed titles into Court Tribunal',
      'Issuance of Payment Receipts & clearance vouchers',
    ],
    documentsRequired: ['Bank Transfer Confirmation Advice', 'Disbursement Ledger Vouchers', 'Tribunal Deposit Record'],
    proofDocuments: [
      {
        code: 'DOC-PAY-001',
        title: 'DBT Direct Bank Disbursement Batch Advice Proof',
        type: 'Bank Advice Vouchers',
        verified: true,
        verifier: 'State Treasury & Public Financial Management System (PFMS)',
        date: '2026-08-26',
        size: '2.6 MB',
        file: 'DBT_PFMS_Disbursement_Advice.pdf',
      },
    ],
  },
  POSSESSION: {
    step: 9,
    title: 'Physical Land Possession',
    legalRef: 'Section 38 & Section 40 - Taking Possession of Land',
    summary: 'Revenue authorities physically take possession of the land plot, issue a Possession Certificate, and transfer title ownership to the requiring body in state revenue records.',
    keyTasks: [
      'Physical site inspection & taking of land possession',
      'Issuance of formal Possession Certificate',
      'Updating revenue records (Khatauni) transferring title to Govt/Requiring Body',
      'Updating GIS parcel status to Acquired (Green)',
    ],
    documentsRequired: ['Possession Certificate', 'Panchnama / Ground Handover Note', 'Updated Revenue Title Record'],
    proofDocuments: [
      {
        code: 'DOC-POS-001',
        title: 'Form G Possession Certificate & Ground Handover Panchnama',
        type: 'Possession Certificate',
        verified: true,
        verifier: 'Sub-Divisional Magistrate (SDM)',
        date: '2026-08-26',
        size: '3.1 MB',
        file: 'Possession_Certificate_FormG.pdf',
      },
    ],
  },
  RR: {
    step: 10,
    title: 'Rehabilitation & Resettlement (R&R)',
    legalRef: 'Section 31 & Second/Third Schedules - R&R Implementation',
    summary: 'Implementation of statutory R&R benefits for displaced families, including housing site allotment, employment allowances, or one-time resettlement grants.',
    keyTasks: [
      'Execution of R&R scheme entitlements for affected families',
      'Allotment of alternative housing plots / constructed houses',
      'Disbursement of one-time resettlement allowances',
      'Monitoring & audit of displaced family rehabilitation',
    ],
    documentsRequired: ['R&R Beneficiary Verification List', 'Housing Plot Allotment Letter', 'Resettlement Grant Vouchers'],
    proofDocuments: [
      {
        code: 'DOC-RR-001',
        title: 'R&R Displaced Families Housing Plot Allotment Proof',
        type: 'R&R Housing Allotment',
        verified: true,
        verifier: 'District Commissioner (R&R)',
        date: '2026-08-26',
        size: '2.8 MB',
        file: 'RR_Housing_Allotment_Letters.pdf',
      },
    ],
  },
  CLOSURE: {
    step: 11,
    title: 'Case Completion & Archiving',
    legalRef: 'Final Administrative Case Closure',
    summary: 'Final administrative audit, legal compliance confirmation, digital archiving of case records, and updating national land acquisition project completion metrics.',
    keyTasks: [
      'Final financial & legal compliance audit',
      'Digital archiving of all case files & court records',
      'Update project total land acquisition progress to 100%',
      'Official closure of acquisition case file',
    ],
    documentsRequired: ['Final Audit Compliance Certificate', 'Case Completion Summary', 'Archival Index'],
    proofDocuments: [
      {
        code: 'DOC-CLS-001',
        title: 'Final Compliance Audit Certificate & Digital Archival Manifest',
        type: 'Audit Closure Proof',
        verified: true,
        verifier: 'Chief Audit Officer (Land Records)',
        date: '2026-08-26',
        size: '1.5 MB',
        file: 'Final_Case_Closure_Manifest.pdf',
      },
    ],
  },
};

const PRIORITY_STYLES = {
  LOW: 'bg-slate-100 text-slate-700',
  MEDIUM: 'bg-blue-100 text-blue-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

const STATUS_STYLES = {
  PENDING: 'bg-amber-100 text-amber-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  SENT_BACK: 'bg-orange-100 text-orange-800',
  REJECTED: 'bg-red-100 text-red-800',
};

const ACTION_CONFIG = {
  APPROVE: {
    label: 'Approve & Forward',
    icon: CheckCircle2,
    className: 'bg-emerald-600 text-white hover:bg-emerald-700',
    description: 'Approve this stage and advance the case to the next step in the pipeline.',
  },
  FORWARD: {
    label: 'Forward',
    icon: ArrowRightCircle,
    className: 'bg-blue-700 text-white hover:bg-blue-800',
    description: 'Forward this case to the next stage for further processing.',
  },
  SEND_BACK: {
    label: 'Send Back',
    icon: RotateCcw,
    className: 'bg-amber-500 text-white hover:bg-amber-600',
    description: 'Return this case to the previous stage for re-verification or correction.',
  },
  REJECT: {
    label: 'Reject',
    icon: XCircle,
    className: 'bg-red-600 text-white hover:bg-red-700',
    description: 'Reject this acquisition case. This action is terminal and cannot be undone.',
  },
  COMPLETE: {
    label: 'Complete & Close',
    icon: CheckCircle2,
    className: 'bg-emerald-600 text-white hover:bg-emerald-700',
    description: 'Mark R&R activities as complete and close this acquisition case.',
  },
};

function timeAgo(dateStr) {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function CaseDetailPage() {
  const { id } = useParams();
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [transitionModal, setTransitionModal] = useState(null); // action name or null
  const [selectedStageKey, setSelectedStageKey] = useState(null);
  const [proofModal, setProofModal] = useState(null);

  const fetchCase = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/workflow/cases/${id}`);
      setCaseData(res.data.data);
    } catch (err) {
      console.error('Failed to fetch case:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  useEffect(() => {
    if (caseData?.current_stage && !selectedStageKey) {
      setSelectedStageKey(caseData.current_stage);
    }
  }, [caseData, selectedStageKey]);

  const canTransition = hasRole('DLAO', 'SGA', 'ADMIN');

  if (loading) {
    return (
      <div className="py-16 text-center">
        <span className="spinner spinner-lg mb-3" />
        <p className="text-sm text-neutral-500">Loading case details...</p>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="card p-12 text-center">
        <GitBranch className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-neutral-800">Case Not Found</h3>
        <p className="text-sm text-neutral-500 mt-1">The requested acquisition case could not be found.</p>
        <Link to="/cases" className="btn btn-primary mt-4 inline-flex">
          <ArrowLeft className="w-4 h-4" /> Back to Cases
        </Link>
      </div>
    );
  }

  const isTerminal = ['COMPLETED', 'REJECTED'].includes(caseData.status);

  return (
    <div className="space-y-6 fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <Link to="/cases" className="hover:text-blue-700 transition-colors">Workflow</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-neutral-800 font-medium">{caseData.case_code}</span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap mb-1">
            <h1 className="page-title flex items-center gap-2 mb-0">
              <GitBranch className="w-6 h-6 text-blue-700" />
              {caseData.case_code}
            </h1>
            <span className={`badge ${PRIORITY_STYLES[caseData.priority] || ''}`}>
              {caseData.priority}
            </span>
            <span className={`badge ${STATUS_STYLES[caseData.status] || ''}`}>
              {caseData.status?.replace('_', ' ')}
            </span>
            {caseData.overdue && (
              <span className="badge bg-red-100 text-red-800 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> OVERDUE
              </span>
            )}
          </div>
          <p className="text-sm text-neutral-500">
            {caseData.remarks || 'No description'}
          </p>
        </div>

        <Link
          to="/cases"
          className="btn btn-secondary self-start flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> All Cases
        </Link>
      </div>

      {/* ─── 11-Step Stage Stepper ───────────────────────────────── */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2 mb-0">
            <Shield className="w-4 h-4 text-blue-600" />
            Workflow Progress
          </h2>
          <span className="text-xs text-neutral-400 italic">Click any step to view its documentation</span>
        </div>

        {/* Desktop stepper */}
        <div className="hidden lg:block">
          <div className="flex items-start">
            {caseData.stageProgress?.map((stage, index) => {
              const isFirst = index === 0;
              const isSelected = stage.key === (selectedStageKey || caseData.current_stage);

              return (
                <div key={stage.key} className="flex-1 flex flex-col items-center relative">
                  {/* Connector line */}
                  {!isFirst && (
                    <div
                      className={`absolute top-3.5 right-1/2 w-full h-0.5 -z-0 ${
                        stage.status === 'completed' || stage.status === 'current'
                          ? 'bg-blue-500'
                          : stage.status === 'rejected'
                          ? 'bg-red-300'
                          : 'bg-neutral-200'
                      }`}
                    />
                  )}

                  {/* Circle */}
                  <button
                    type="button"
                    onClick={() => setSelectedStageKey(stage.key)}
                    className={`relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all transform hover:scale-110 cursor-pointer ${
                      isSelected
                        ? 'ring-4 ring-blue-300 shadow-md font-extrabold'
                        : ''
                    } ${
                      stage.status === 'completed'
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : stage.status === 'current'
                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-100 animate-pulse'
                        : stage.status === 'rejected'
                        ? 'bg-red-500 text-white'
                        : 'bg-neutral-200 text-neutral-500'
                    }`}
                    title={`Click to view ${stage.label} documentation`}
                  >
                    {stage.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : stage.status === 'rejected' ? (
                      <XCircle className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </button>

                  {/* Label */}
                  <button
                    type="button"
                    onClick={() => setSelectedStageKey(stage.key)}
                    className={`text-[10px] mt-2 text-center leading-tight font-medium max-w-[80px] hover:text-blue-700 transition-colors cursor-pointer ${
                      isSelected
                        ? 'text-blue-700 font-extrabold underline'
                        : stage.status === 'current'
                        ? 'text-blue-700 font-bold'
                        : stage.status === 'completed'
                        ? 'text-emerald-700'
                        : 'text-neutral-400'
                    }`}
                  >
                    {stage.label}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Mobile stepper (vertical) */}
        <div className="lg:hidden space-y-2">
          {caseData.stageProgress?.map((stage, index) => {
            const isSelected = stage.key === (selectedStageKey || caseData.current_stage);
            return (
              <button
                key={stage.key}
                type="button"
                onClick={() => setSelectedStageKey(stage.key)}
                className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${isSelected ? 'bg-blue-50 border border-blue-200' : ''}`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    stage.status === 'completed'
                      ? 'bg-emerald-500 text-white'
                      : stage.status === 'current'
                      ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                      : stage.status === 'rejected'
                      ? 'bg-red-500 text-white'
                      : 'bg-neutral-200 text-neutral-500'
                  }`}
                >
                  {stage.status === 'completed' ? '✓' : index + 1}
                </div>
                <span
                  className={`text-xs font-medium ${
                    isSelected
                      ? 'text-blue-700 font-bold'
                      : stage.status === 'current'
                      ? 'text-blue-700 font-bold'
                      : stage.status === 'completed'
                      ? 'text-emerald-700'
                      : 'text-neutral-400'
                  }`}
                >
                  {stage.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Main Content Grid ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Case Info + Actions */}
        <div className="lg:col-span-1 space-y-6">
          {/* Case Info Card */}
          <div className="card">
            <div className="card-header">
              <h3 className="text-sm font-bold text-neutral-700">Case Information</h3>
            </div>
            <div className="card-body space-y-4">
              <InfoRow icon={GitBranch} label="Case Code" value={caseData.case_code} />
              <InfoRow
                icon={FolderKanban}
                label="Project"
                value={
                  <Link to={`/projects/${caseData.project_id}`} className="text-blue-700 hover:underline">
                    {caseData.project_code} — {caseData.project_name}
                  </Link>
                }
              />
              {caseData.parcel_code && (
                <InfoRow
                  icon={MapPin}
                  label="Parcel"
                  value={
                    <Link to={`/parcels/${caseData.parcel_id}`} className="text-blue-700 hover:underline">
                      {caseData.parcel_code} — {caseData.survey_number}
                    </Link>
                  }
                />
              )}
              <InfoRow
                icon={User}
                label="Assigned Officer"
                value={
                  <div>
                    <span className="font-medium">{caseData.assigned_officer_name || 'Unassigned'}</span>
                    {caseData.assigned_officer_role && (
                      <span className="text-neutral-400 text-[10px] block">{caseData.assigned_officer_role}</span>
                    )}
                  </div>
                }
              />
              <InfoRow
                icon={Calendar}
                label="Due Date"
                value={
                  <span className={caseData.overdue ? 'text-red-600 font-bold' : ''}>
                    {caseData.due_date ? new Date(caseData.due_date).toLocaleDateString() : 'No deadline'}
                    {caseData.overdue && ' (OVERDUE)'}
                  </span>
                }
              />
              <InfoRow
                icon={Clock}
                label="Created"
                value={new Date(caseData.created_at).toLocaleString()}
              />
            </div>
          </div>

          {/* Action Buttons */}
          {canTransition && !isTerminal && caseData.allowedActions?.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h3 className="text-sm font-bold text-neutral-700">Workflow Actions</h3>
              </div>
              <div className="card-body space-y-2">
                {caseData.allowedActions.map((action) => {
                  const config = ACTION_CONFIG[action];
                  if (!config) return null;
                  const Icon = config.icon;
                  return (
                    <button
                      key={action}
                      onClick={() => setTransitionModal(action)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${config.className}`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <div className="text-left">
                        <div>{config.label}</div>
                        <div className="text-[10px] font-normal opacity-80">{config.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {isTerminal && (
            <div className={`card border-2 ${caseData.status === 'COMPLETED' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
              <div className="card-body text-center py-6">
                {caseData.status === 'COMPLETED' ? (
                  <>
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                    <p className="font-bold text-emerald-800">Case Completed</p>
                    <p className="text-xs text-emerald-600 mt-1">This acquisition case has been completed successfully.</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-10 h-10 text-red-600 mx-auto mb-2" />
                    <p className="font-bold text-red-800">Case Rejected</p>
                    <p className="text-xs text-red-600 mt-1">This acquisition case has been rejected.</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Stage Guidance & Audit Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stage Documentation Guidance Card */}
          {(() => {
            const activeKey = selectedStageKey || caseData.current_stage;
            const doc = STAGE_DOCUMENTATION[activeKey] || STAGE_DOCUMENTATION.PROJECT_PROPOSAL;
            const isCurrentActive = activeKey === caseData.current_stage;

            return (
              <div className="card border border-blue-100 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-4 px-6">
                  <div>
                    <div className="flex items-center gap-2 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-1">
                      <BookOpen className="w-4 h-4 text-blue-400" />
                      Stage Guidance — Step {doc.step} of 11
                      {isCurrentActive && (
                        <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                          Current Case Stage
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      {doc.title}
                    </h3>
                  </div>
                  <span className="bg-blue-800/80 border border-blue-700 text-blue-100 text-xs font-mono px-3 py-1.5 rounded-lg flex items-center gap-1.5 self-start sm:self-auto">
                    <Scale className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                    {doc.legalRef}
                  </span>
                </div>

                <div className="p-6 space-y-5">
                  {/* Stage Switcher Pills */}
                  <div>
                    <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">Select Stage to View Documentation:</p>
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-neutral-100 no-scrollbar">
                      {Object.keys(STAGE_DOCUMENTATION).map((sKey) => {
                        const sDoc = STAGE_DOCUMENTATION[sKey];
                        const isSelected = sKey === activeKey;
                        const isCurrent = sKey === caseData.current_stage;
                        return (
                          <button
                            key={sKey}
                            type="button"
                            onClick={() => setSelectedStageKey(sKey)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-sm font-semibold'
                                : isCurrent
                                ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold'
                                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                            }`}
                          >
                            <span className="text-[10px] opacity-75 font-mono">#{sDoc.step}</span>
                            {sDoc.title.split(':')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Summary Callout */}
                  <div className="bg-blue-50/80 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-neutral-700 leading-relaxed">
                      {doc.summary}
                    </p>
                  </div>

                  {/* Tasks & Required Docs Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Key Tasks */}
                    <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/80 space-y-2">
                      <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <ListChecks className="w-4 h-4 text-emerald-600" /> Key Tasks & Procedural Workflow
                      </h4>
                      <ul className="space-y-2">
                        {doc.keyTasks.map((task, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-xs text-neutral-700">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                            <span>{task}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Mandatory Documents */}
                    <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-200/80 space-y-2">
                      <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" /> Mandatory Documents Checklist
                      </h4>
                      <div className="flex flex-col gap-2">
                        {doc.documentsRequired.map((docName, idx) => (
                          <div key={idx} className="bg-white border border-neutral-200 text-neutral-700 text-xs px-3 py-2 rounded-lg flex items-center gap-2 shadow-2xs">
                            <FileCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            <span className="font-medium">{docName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Proof & Evidentiary Documents Section */}
                  <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-xl p-4 border border-blue-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-700" />
                        Stage Proof & Evidentiary Records ({doc.proofDocuments?.length || 0} Files)
                      </h4>
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Proof Available
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {doc.proofDocuments?.map((proof, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-neutral-200 shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono mb-1">
                              <span>{proof.code}</span>
                              <span className="text-emerald-700 font-sans font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                              </span>
                            </div>
                            <p className="text-xs font-bold text-neutral-900 line-clamp-1">{proof.title}</p>
                            <p className="text-[10px] text-neutral-500 mt-0.5">Verified by: {proof.verifier}</p>
                          </div>
                          <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-neutral-100 text-[10px] text-neutral-500">
                            <span>{proof.date} • {proof.size}</span>
                            <button
                              type="button"
                              onClick={() => setProofModal(proof)}
                              className="btn btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1.5 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 cursor-pointer"
                            >
                              <FileText className="w-3 h-3 text-blue-600" /> View Proof
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Audit Timeline */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h3 className="text-sm font-bold text-neutral-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                Audit Timeline
              </h3>
              <span className="text-xs text-neutral-400">
                {caseData.auditTimeline?.length || 0} events
              </span>
            </div>
            <div className="card-body">
              {(!caseData.auditTimeline || caseData.auditTimeline.length === 0) ? (
                <p className="text-sm text-neutral-400 text-center py-8">No audit events recorded.</p>
              ) : (
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-neutral-200" />

                  <div className="space-y-1">
                    {caseData.auditTimeline.map((event, index) => (
                      <TimelineEvent key={event.id} event={event} isLast={index === caseData.auditTimeline.length - 1} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transition Modal */}
      {transitionModal && (
        <TransitionModal
          action={transitionModal}
          caseData={caseData}
          onClose={() => setTransitionModal(null)}
          onSuccess={() => {
            setTransitionModal(null);
            fetchCase();
          }}
        />
      )}

      {/* Proof Viewer Modal */}
      {proofModal && (
        <ProofModal proof={proofModal} onClose={() => setProofModal(null)} />
      )}
    </div>
  );
}

// ─── Info Row Component ─────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-neutral-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">{label}</p>
        <div className="text-sm text-neutral-800">{value}</div>
      </div>
    </div>
  );
}

// ─── Timeline Event Component ───────────────────────────────────────
function TimelineEvent({ event, isLast }) {
  const actionColors = {
    CREATE: 'bg-blue-500',
    APPROVE: 'bg-emerald-500',
    FORWARD: 'bg-blue-500',
    SEND_BACK: 'bg-amber-500',
    REJECT: 'bg-red-500',
    COMPLETE: 'bg-emerald-500',
  };

  const actionLabels = {
    CREATE: 'Created',
    APPROVE: 'Approved',
    FORWARD: 'Forwarded',
    SEND_BACK: 'Sent Back',
    REJECT: 'Rejected',
    COMPLETE: 'Completed',
  };

  return (
    <div className="relative flex gap-4 pb-5">
      {/* Dot */}
      <div className={`relative z-10 w-[10px] h-[10px] rounded-full mt-1.5 flex-shrink-0 ring-2 ring-white ${actionColors[event.action] || 'bg-neutral-400'}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide text-white ${actionColors[event.action] || 'bg-neutral-400'}`}>
            {actionLabels[event.action] || event.action}
          </span>
          {event.from_stage && event.to_stage && event.from_stage !== event.to_stage && (
            <span className="text-[10px] text-neutral-500">
              {STAGE_LABELS[event.from_stage]} → {STAGE_LABELS[event.to_stage]}
            </span>
          )}
          {!event.from_stage && event.to_stage && (
            <span className="text-[10px] text-neutral-500">
              → {STAGE_LABELS[event.to_stage]}
            </span>
          )}
        </div>

        {event.remarks && (
          <p className="text-sm text-neutral-700 leading-relaxed mb-1.5">
            {event.remarks}
          </p>
        )}

        <div className="flex items-center gap-3 text-[11px] text-neutral-400">
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {event.performed_by_name || 'System'}
            {event.performed_by_role && ` (${event.performed_by_role})`}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {timeAgo(event.created_at)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Transition Modal ───────────────────────────────────────────────
function TransitionModal({ action, caseData, onClose, onSuccess }) {
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const config = ACTION_CONFIG[action];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (remarks.trim().length < 3) {
      setError('Please provide meaningful remarks (at least 3 characters).');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await api.post(`/workflow/cases/${caseData.id}/transition`, {
        action,
        remarks: remarks.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Transition failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const Icon = config?.icon || GitBranch;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
          <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Icon className="w-5 h-5" /> {config?.label || action}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-neutral-600">
            {config?.description}
          </p>

          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-500">Case</span>
              <span className="font-mono font-bold text-neutral-800">{caseData.case_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Current Stage</span>
              <span className="font-medium text-neutral-800">{STAGE_LABELS[caseData.current_stage]}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="form-label">Remarks *</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="form-input"
              rows={4}
              placeholder="Provide your decision rationale, observations, or instructions..."
              required
              minLength={3}
              autoFocus
            />
          </div>

          {action === 'REJECT' && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              <strong>⚠ Warning:</strong> Rejecting this case is a permanent action. The case will be closed and cannot be reopened.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
            <button
              type="submit"
              disabled={submitting}
              className={`btn ${config?.className || 'btn-primary'}`}
            >
              {submitting ? <span className="spinner" /> : <Icon className="w-4 h-4" />}
              Confirm {config?.label || action}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Proof Viewer Modal Component ──────────────────────────────────
function ProofModal({ proof, onClose }) {
  if (!proof) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto fade-in border border-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-slate-900 text-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">{proof.title}</h3>
              <p className="text-[10px] text-slate-300 font-mono">{proof.code} • Verified Statutory Proof Record</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Simulated Document Preview */}
        <div className="p-6 space-y-5">
          {/* Document Header Card */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute right-3 top-3 opacity-10">
              <ShieldCheck className="w-24 h-24 text-blue-900" />
            </div>

            <div className="relative z-10 space-y-2">
              <span className="bg-blue-700 text-white text-[10px] font-mono uppercase px-2.5 py-0.5 rounded font-bold">
                Official Document Proof
              </span>
              <h4 className="text-base font-bold text-neutral-900">{proof.title}</h4>
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs text-neutral-600 border-t border-blue-200/60">
                <div><span className="font-semibold text-neutral-800">Document Code:</span> {proof.code}</div>
                <div><span className="font-semibold text-neutral-800">Document Type:</span> {proof.type}</div>
                <div><span className="font-semibold text-neutral-800">Issuing Authority:</span> {proof.verifier}</div>
                <div><span className="font-semibold text-neutral-800">Publication Date:</span> {proof.date}</div>
              </div>
            </div>
          </div>

          {/* Simulated Document Preview Paper */}
          <div className="bg-neutral-50 border border-neutral-300 rounded-xl p-6 shadow-inner font-serif text-neutral-800 text-xs space-y-4">
            <div className="text-center border-b border-neutral-300 pb-3">
              <p className="font-bold text-sm tracking-wider uppercase text-neutral-900">Government of Uttar Pradesh / India</p>
              <p className="text-[11px] font-bold text-blue-900">LAND ACQUISITION & REVENUE DEPARTMENT</p>
              <p className="text-[10px] text-neutral-500 font-sans italic mt-0.5">Verification Stamp: {proof.code} / LA-AUTHENTICATED</p>
            </div>

            <div className="space-y-2 leading-relaxed">
              <p className="font-bold font-sans text-neutral-900 text-sm">{proof.title}</p>
              <p>
                This document serves as conclusive legal proof for Stage <strong>{proof.type}</strong> executed under statutory authority.
                All parameters, boundary dimensions, and beneficiary records associated with file <code>{proof.file}</code> have been verified and certified.
              </p>
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded text-[11px] font-sans text-emerald-900 flex items-center justify-between">
                <span>Verification Authority: <strong>{proof.verifier}</strong></span>
                <span className="font-bold text-emerald-700 font-mono">STATUS: SEALED & CERTIFIED</span>
              </div>
            </div>

            <div className="flex justify-between items-end pt-4 border-t border-neutral-300 font-sans text-[10px] text-neutral-500">
              <div>
                <p>Digital Hash: <code>sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</code></p>
                <p>Recorded On: {proof.date}</p>
              </div>
              <div className="text-right">
                <span className="border-2 border-emerald-600 text-emerald-700 font-bold font-mono px-3 py-1 rounded tracking-wider uppercase text-[10px] inline-block">
                  OFFICIAL PROOF SEAL
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="btn btn-secondary">Close</button>
            <a
              href={`#download-${proof.code}`}
              onClick={(e) => { e.preventDefault(); alert(`Downloading ${proof.file} (${proof.size})...`); }}
              className="btn btn-primary flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Download Official File ({proof.size})
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
