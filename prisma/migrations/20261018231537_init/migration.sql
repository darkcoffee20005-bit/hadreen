-- CreateEnum
CREATE TYPE "Lang" AS ENUM ('ar', 'en');

-- CreateEnum
CREATE TYPE "WeddingStatus" AS ENUM ('draft', 'live');

-- CreateEnum
CREATE TYPE "GuestSource" AS ENUM ('invited', 'open');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('opened', 'intro_completed', 'rsvp', 'calendar', 'map');

-- CreateTable
CREATE TABLE "Wedding" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "lang" "Lang" NOT NULL DEFAULT 'ar',
    "groomName" TEXT NOT NULL,
    "brideName" TEXT NOT NULL,
    "monogram" TEXT NOT NULL,
    "dateTimeUtc" TIMESTAMPTZ(3) NOT NULL,
    "verse" TEXT,
    "intro" TEXT NOT NULL DEFAULT '',
    "venueName" TEXT NOT NULL,
    "venueArea" TEXT NOT NULL,
    "mapsUrl" TEXT NOT NULL DEFAULT '',
    "dressCode" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT NOT NULL DEFAULT '',
    "rsvpDeadline" TIMESTAMPTZ(3) NOT NULL,
    "schedule" JSONB NOT NULL DEFAULT '[]',
    "musicTrack" TEXT NOT NULL,
    "paletteOverrides" JSONB NOT NULL DEFAULT '{}',
    "originCity" TEXT,
    "destinationCity" TEXT,
    "status" "WeddingStatus" NOT NULL DEFAULT 'draft',
    "coupleSecret" TEXT NOT NULL,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "openRsvpMaxSeats" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wedding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL,
    "weddingId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "maxSeats" INTEGER NOT NULL DEFAULT 2,
    "group" TEXT,
    "source" "GuestSource" NOT NULL DEFAULT 'invited',
    "clientKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rsvp" (
    "id" TEXT NOT NULL,
    "guestId" TEXT NOT NULL,
    "attending" BOOLEAN NOT NULL,
    "seats" INTEGER NOT NULL,
    "message" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rsvp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" BIGSERIAL NOT NULL,
    "weddingId" TEXT NOT NULL,
    "guestId" TEXT,
    "type" "EventType" NOT NULL,
    "userAgent" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wedding_slug_key" ON "Wedding"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Wedding_coupleSecret_key" ON "Wedding"("coupleSecret");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_token_key" ON "Guest"("token");

-- CreateIndex
CREATE INDEX "Guest_weddingId_idx" ON "Guest"("weddingId");

-- CreateIndex
CREATE UNIQUE INDEX "Guest_weddingId_clientKey_key" ON "Guest"("weddingId", "clientKey");

-- CreateIndex
CREATE UNIQUE INDEX "Rsvp_guestId_key" ON "Rsvp"("guestId");

-- CreateIndex
CREATE INDEX "Event_weddingId_type_createdAt_idx" ON "Event"("weddingId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "Event_guestId_idx" ON "Event"("guestId");

-- AddForeignKey
ALTER TABLE "Guest" ADD CONSTRAINT "Guest_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rsvp" ADD CONSTRAINT "Rsvp_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_weddingId_fkey" FOREIGN KEY ("weddingId") REFERENCES "Wedding"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
