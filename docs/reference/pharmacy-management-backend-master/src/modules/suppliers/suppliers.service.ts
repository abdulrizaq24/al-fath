import { prisma } from "../../config/prisma.js";

interface CreateSupplierInput {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

interface UpdateSupplierInput {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export async function createSupplier(
  pharmacyId: string,
  data: CreateSupplierInput,
) {
  const existingSupplier = await prisma.supplier.findFirst({
    where: {
      pharmacyId,
      name: data.name,
    },
  });

  if (existingSupplier) {
    throw new Error("Supplier already exists");
  }

  return prisma.supplier.create({
    data: {
      pharmacyId,
      name: data.name,

      ...(data.contactPerson !== undefined && {
        contactPerson: data.contactPerson,
      }),

      ...(data.phone !== undefined && {
        phone: data.phone,
      }),

      ...(data.email !== undefined && {
        email: data.email,
      }),

      ...(data.address !== undefined && {
        address: data.address,
      }),

      ...(data.notes !== undefined && {
        notes: data.notes,
      }),
    },
  });
}

export async function getSuppliers(pharmacyId: string) {
  return prisma.supplier.findMany({
    where: {
      pharmacyId,
      isActive: true,
    },

    orderBy: {
      name: "asc",
    },
  });
}

export async function updateSupplier(
  pharmacyId: string,
  supplierId: string,
  data: UpdateSupplierInput,
) {
  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      pharmacyId,
    },
  });

  if (!supplier) {
    throw new Error("Supplier not found");
  }

  if (data.name !== undefined && data.name !== supplier.name) {
    const existingSupplier = await prisma.supplier.findFirst({
      where: {
        pharmacyId,
        name: data.name,
        NOT: {
          id: supplierId,
        },
      },
    });

    if (existingSupplier) {
      throw new Error("Supplier already exists");
    }
  }

  return prisma.supplier.update({
    where: {
      id: supplierId,
    },

    data: {
      ...(data.name !== undefined && {
        name: data.name,
      }),

      ...(data.contactPerson !== undefined && {
        contactPerson: data.contactPerson,
      }),

      ...(data.phone !== undefined && {
        phone: data.phone,
      }),

      ...(data.email !== undefined && {
        email: data.email,
      }),

      ...(data.address !== undefined && {
        address: data.address,
      }),

      ...(data.notes !== undefined && {
        notes: data.notes,
      }),
    },
  });
}

export async function updateSupplierStatus(
  pharmacyId: string,
  supplierId: string,
  isActive: boolean,
) {
  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      pharmacyId,
    },
  });

  if (!supplier) {
    throw new Error("Supplier not found");
  }

  return prisma.supplier.update({
    where: {
      id: supplierId,
    },

    data: {
      isActive,
    },
  });
}
