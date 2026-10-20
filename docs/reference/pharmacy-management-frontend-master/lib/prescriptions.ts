export type PrescriptionItem = {
  id: string;
  medicineId: string;
  quantityPrescribed: number;
  directions: string | null;
  notes: string | null;
  medicine: {
    id: string;
    name: string;
    genericName: string | null;
    strength: string | null;
  };
};

export type PrescriptionPatient = {
  id: string;
  patientNumber?: string;
  firstName?: string;
  lastName?: string | null;
  name: string;
};

export type Prescription = {
  id: string;
  prescriptionNumber: string;
  prescriberName: string;
  prescriptionDate: string;
  status: string;
  notes: string | null;

  patient: PrescriptionPatient;

  createdBy?: {
    id: string;
    name: string;
    username: string;
  };

  items: PrescriptionItem[];

  createdAt: string;
  updatedAt: string;
};

type PrescriptionsResponse = {
  prescriptions: Array<
    Omit<Prescription, "patient"> & {
      patient: {
        id: string;
        patientNumber?: string;
        firstName?: string;
        lastName?: string | null;
        name?: string;
      };
    }
  >;
};

type PrescriptionResponse = {
  prescription: Prescription;
  message?: string;
};

export type CreatePrescriptionItemInput = {
  medicineId: string;
  quantity: number;
  directions?: string;
  notes?: string;
};

export type CreatePrescriptionInput = {
  patientId: string;
  prescriptionNumber: string;
  prescriberName: string;
  prescriptionDate?: string;
  notes?: string;
  items: CreatePrescriptionItemInput[];
};

const API_URL = "http://localhost:4000/api";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("pharmacy_token");

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data && typeof data.message === "string"
        ? data.message
        : `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

function normalizePatient(
  patient: PrescriptionsResponse["prescriptions"][number]["patient"],
): PrescriptionPatient {
  const firstName = patient.firstName ?? "";
  const lastName = patient.lastName ?? "";

  const generatedName = `${firstName} ${lastName}`.trim();

  return {
    id: patient.id,
    patientNumber: patient.patientNumber,
    firstName: patient.firstName,
    lastName: patient.lastName,
    name: patient.name?.trim() || generatedName || "Unknown patient",
  };
}

export async function getPrescriptions(): Promise<Prescription[]> {
  const response = await fetch(`${API_URL}/prescriptions`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  const data = await handleResponse<PrescriptionsResponse>(response);

  return data.prescriptions.map((prescription) => ({
    ...prescription,

    patient: normalizePatient(prescription.patient),
  }));
}

export async function getPrescription(id: string): Promise<Prescription> {
  const response = await fetch(`${API_URL}/prescriptions/${id}`, {
    method: "GET",
    headers: getAuthHeaders(),
    cache: "no-store",
  });

  const data = await handleResponse<PrescriptionResponse>(response);

  return {
    ...data.prescription,

    patient: normalizePatient(data.prescription.patient),
  };
}

export async function createPrescription(
  input: CreatePrescriptionInput,
): Promise<Prescription> {
  const response = await fetch(`${API_URL}/prescriptions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(input),
  });

  const data = await handleResponse<PrescriptionResponse>(response);

  return {
    ...data.prescription,

    patient: normalizePatient(data.prescription.patient),
  };
}
