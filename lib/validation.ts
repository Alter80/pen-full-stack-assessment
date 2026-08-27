import { z } from "zod";

export const enrolmentStatusSchema = z.enum(["ENROLLED", "DEFERRED", "WITHDRAWN", "COMPLETED"]);

export const createStudentSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  dateOfBirth: z.coerce.date("Enter a valid date of birth"),
  programmeId: z.string().min(1, "Select a programme"),
  academicYear: z.coerce.number("Enter the year of study").int().min(1).max(8),
  enrolmentStatus: enrolmentStatusSchema.optional(),
  feeAmount: z.coerce.number("Enter a valid fee amount").positive().optional(),
});

export const updateStudentSchema = z.object({
  fullName: z.string().trim().min(1).max(200).optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").optional(),
  dateOfBirth: z.coerce.date().optional(),
  programmeId: z.string().min(1).optional(),
  academicYear: z.coerce.number().int().min(1).max(8).optional(),
  enrolmentStatus: enrolmentStatusSchema.optional(),
  feeAmount: z.coerce.number().positive().optional(),
  feeDueDate: z.coerce.date().optional(),
});

export const createProgrammeSchema = z.object({
  code: z.string().trim().min(1, "Code is required").max(20),
  name: z.string().trim().min(1, "Name is required").max(200),
  feeAmount: z.coerce.number("Enter a valid fee amount").positive(),
});

export const recordPaymentSchema = z.object({
  amount: z.coerce.number("Enter a valid amount").positive(),
  paymentDate: z.coerce.date("Enter a valid payment date"),
  referenceNumber: z.string().trim().min(1, "Reference number is required").max(100),
});

export const createAssessmentSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  module: z.string().trim().min(1, "Module is required").max(200),
  programmeId: z.string().min(1, "Select a programme"),
  deadline: z.coerce.date("Enter a valid deadline"),
});

export const gradeInputSchema = z.object({
  studentId: z.string().min(1),
  score: z.coerce.number("Enter a numeric grade").int().min(0).max(100),
});

export const updateGradeSchema = z.object({
  score: z.coerce.number().int().min(0).max(100).optional(),
  isPublished: z.boolean().optional(),
});
