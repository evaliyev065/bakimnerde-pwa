export interface Principal {
  userId: string;
  tenantId: string;
  tenantKey: string;
  tenantName: string;
  tenantType: "CONTRACTOR";
  name: string;
  email: string;
  role: "FIELD_WORKER";
}

export type JobStatus =
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "ADDITIONAL_SUPPLY"
  | "MAINTENANCE_DONE"
  | "MAINTENANCE_APPROVED"
  | "CPO_APPROVAL"
  | "PAID"
  | "CLOSED";

export interface Job {
  documentId: string;
  id: string;
  station: string;
  city: string;
  district: string;
  maintenanceTarget: "DEVICE" | "STATION";
  stationMaintenanceArea?: "GENERAL_COMPONENTS" | "GRID_CONNECTION" | null;
  charger?: string | null;
  chargerModel?: string | null;
  status: JobStatus;
  appointmentAt?: string;
  deadlineAt: string;
  contractorAcceptedAt?: string;
  maintenanceStartedAt?: string;
  workflowCycle: number;
  cpo: string;
  contractor: string;
  fieldWorkerUserId?: string;
  fieldWorkerName?: string;
  fieldWorkerPhone?: string;
}

export type EvidencePhase = "BEFORE" | "AFTER" | "BRANDED";

export interface Evidence {
  id: string;
  phase: EvidencePhase;
  url: string;
  description: string;
  createdAt: string;
}

export interface FieldReport {
  id: string;
  serviceType: string;
  equipmentCondition: string;
  faultCategory: string;
  actionTaken: string;
  safetyResult: string;
  measurements?: {
    inputVoltage?: number | null;
    outputVoltage?: number | null;
  };
  notes: string;
  completed: boolean;
  updatedAt: string;
}
