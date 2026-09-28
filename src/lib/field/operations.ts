import { z } from "zod";

export const fieldOperationTypes = ["CHECK_IN", "SOS", "INVENTORY_CONSUMPTION", "SUPPLY_REQUEST", "DEVICE_HEARTBEAT"] as const;
export type FieldOperationType = (typeof fieldOperationTypes)[number];

export const checkInPayloadSchema = z.object({
  missionId: z.string(),
  message: z.string().max(500).optional(),
  simulatedLatitude: z.number().min(-90).max(90).optional(),
  simulatedLongitude: z.number().min(-180).max(180).optional(),
});

export const sosPayloadSchema = z.object({
  missionId: z.string().optional(),
  message: z.string().min(3).max(500),
  simulatedLatitude: z.number().min(-90).max(90).optional(),
  simulatedLongitude: z.number().min(-180).max(180).optional(),
});

export const inventoryConsumptionPayloadSchema = z.object({
  inventoryItemId: z.string(),
  quantity: z.coerce.number().positive(),
  note: z.string().max(200).optional(),
});

export const supplyRequestPayloadSchema = z.object({
  itemName: z.string().trim().min(2).max(120),
  quantity: z.coerce.number().positive(),
  unit: z.string().trim().min(1).max(24),
  note: z.string().trim().max(200).optional(),
});

export const deviceHeartbeatPayloadSchema = z.object({
  simulatedLatitude: z.number().optional(),
  simulatedLongitude: z.number().optional(),
});

export const queuedOperationSchema = z.object({
  clientOperationId: z.string().min(8),
  operationType: z.enum(fieldOperationTypes),
  payload: z.record(z.string(), z.unknown()),
  clientCreatedAt: z.string().datetime().optional(),
});

export const syncBodySchema = z.object({
  operations: z.array(queuedOperationSchema).min(1).max(25),
});
