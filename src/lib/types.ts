
import type { Timestamp } from 'firebase/firestore'; // Assuming firebase/firestore types
import type { UserRole, TripFeature } from './constants';

// For mock purposes, Timestamp can be Date
type MockTimestamp = Date;

export interface UserProfile {
  uid: string;
  email: string | null;
  role: UserRole;
  displayName?: string;
  createdAt: Date | Timestamp; // Kept Timestamp for flexibility if needed before conversion
}

export interface Destination {
  id: string;
  name: string;
  name_ar?: string; // Added for Arabic translation
  description: string;
  description_ar?: string; // Added for Arabic translation
  imageUrl?: string;
  dataAiHint?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface HotelImage {
  url: string;
  dataAiHint?: string;
  // source?: 'url' | 'upload'; // For future differentiation
}

export interface HotelRoomInventoryItem { // Inventory items listed AT a hotel
  roomTypeId: string;
  roomTypeName?: string; // For display convenience
  count: number; // Total physical rooms of this type in the hotel
}

export interface Hotel {
  id: string;
  name: string;
  address: string;
  description: string;
  imageUrls?: HotelImage[]; // Replaces imageUrl and dataAiHint
  destinationId: string; // Reference to destinations collection
  destinationName?: string; // For display purposes
  roomInventory?: HotelRoomInventoryItem[]; // Master inventory for the hotel
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RoomType {
  id: string;
  name: string;
  description: string;
  capacity: number; // Number of people
  createdAt?: Date;
  updatedAt?: Date;
}

// This interface describes a specific room type's pricing for a particular TripDate
export interface TripDateRoomAvailability {
  roomTypeId: string;
  roomTypeName?: string; // For display convenience on view pages
  pricePerPerson: number;
}

export interface ExtraFeeConfig {
  id: string; // Unique ID for the fee configuration, intended to be persisted with TripDate.
  name: string;
  description?: string;
  pricePerPerson: number;
}

export interface TripDate {
  id: string;
  destinationId: string;
  hotelId: string;
  startDate: Date | Timestamp;
  endDate: Date | Timestamp;
  availableRoomsByType: TripDateRoomAvailability[]; // Array of room types offered and their prices for this trip
  transportationPricePerPerson?: number;
  childPricePerPerson?: number;
  childMaxAge?: number; // e.g., 12 (up to 12 years old)
  selectedFeatures?: TripFeature[];
  extraFees?: ExtraFeeConfig[]; // Optional extra fees for the trip
  status: 'active' | 'full' | 'cancelled';
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export interface RequestedRoomItem {
  roomTypeId: string;
  roomTypeName?: string;
  pricePerPerson?: number; // Price per person for this room type for this trip
  capacity?: number; // Capacity of this room type
  numberOfRooms: number;
}

export interface SelectedExtraFee { // Stored on the reservation document
  id: string;                   // ID of the ExtraFeeConfig from TripDate
  name: string;                 // Name of the fee at time of booking
  pricePerPerson: number;       // Price of the fee at time of booking
  numberOfGuestsForFee: number; // Number of guests this fee applies to for this reservation
}

export interface InitialReservation {
  id: string;
  userId?: string; // ID of the user who made the reservation
  tripDateId: string;
  hotelId: string;
  destinationId: string;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  numberOfGuests?: number;
  requestedRooms?: RequestedRoomItem[];
  selectedExtraFees?: SelectedExtraFee[]; // Guest's chosen extra fees
  numberOfTransportationSeats?: number;
  reservationDate: Date | Timestamp;
  status: 'pending' | 'contacted' | 'confirmed' | 'cancelled';
  notes?: string;
  totalCalculatedPrice?: number;
  depositAmount?: number;
  contactedByUid?: string;
  contactedByName?: string;
  contactedAt?: Date | Timestamp;
  confirmedByUid?: string;
  confirmedByName?: string;
  confirmedAt?: Date | Timestamp;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export interface TripExpense {
  id: string;
  tripDateId: string; // Links to TripDate
  description: string;
  amount: number;
  date: Date | Timestamp;
  notes?: string;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export type AdministrationExpenseCategory = 
  | 'Salaries' 
  | 'Rent' 
  | 'Hotel Insurance' 
  | 'Hotel Water' 
  | 'Hotel Electric' 
  | 'Office Supplies'
  | 'Marketing'
  | 'Maintenance'
  | 'Other';

export interface AdministrationExpense {
  id: string;
  category: AdministrationExpenseCategory;
  description?: string; // Optional more specific description if category is 'Other' or needs detail
  amount: number;
  expenseDate: Date | Timestamp; // The date the expense was incurred or paid
  notes?: string;
  createdAt?: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export interface Notification {
  id: string;
  message: string;
  link?: string;
  timestamp: Timestamp | Date; // Firestore Timestamp on save, Date on retrieval
  type: 'new_reservation' | 'status_update' | 'general';
  reservationId?: string; // Link back to the reservation if applicable
  // isReadBy?: string[]; // For future per-user read status
  targetRoles?: UserRole[]; // For role-based targeting if needed, simple for now
}

export interface HomepageBanner {
  id: string;
  type: 'image' | 'video';
  url: string;
  altText?: string; // For image alt text or video title
  aboutUsText?: string; // English "About Us" text
  aboutUsText_ar?: string; // Arabic "About Us" text
  order: number;
  isActive: boolean;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
}

export interface HomepageConfig { 
  id?: string; 
  heroImageUrl?: string;
  heroImageAiHint?: string;
  heroVideoUrl?: string; // Added for hero video
}
