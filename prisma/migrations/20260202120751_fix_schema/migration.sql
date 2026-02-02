/*
  Warnings:

  - The values [transfer] on the enum `PaymentMethod` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `otp` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `otpExpire` on the `User` table. All the data in the column will be lost.
  - Made the column `otp` on table `Otp` required. This step will fail if there are existing NULL values in that column.
  - Made the column `expireAt` on table `Otp` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentMethod_new" AS ENUM ('cash', 'visa', 'transfercl');
ALTER TABLE "Invoice" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod_new" USING ("paymentMethod"::text::"PaymentMethod_new");
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
ALTER TYPE "PaymentMethod_new" RENAME TO "PaymentMethod";
DROP TYPE "public"."PaymentMethod_old";
COMMIT;

-- AlterTable
ALTER TABLE "Otp" ALTER COLUMN "otp" SET NOT NULL,
ALTER COLUMN "expireAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "otp",
DROP COLUMN "otpExpire";
