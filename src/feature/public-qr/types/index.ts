export type PublicQrPayload = {
  menuName: string;
  durabilityNote: string;
  sppgName: string;
  sppgAddress: string;
  schoolName: string;
  schoolAddress: string;
  portionQty: string;
  portionType: string;
  productionCode: string;
  deliveryCode: string;
  safeUntil: string | null;
  createdAt: string | null;
  departedAt: string | null;
  receivedAt: string | null;
  productionStatus: string;
  deliveryStatus: string;
  safetyStatus: string;
};
