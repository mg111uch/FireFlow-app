// Centralized services configuration
// This file contains all services and their subservices data

export interface SubService {
  id: number,
  name: string;
  description?: string;
}

export interface Service {
  id: number
  name: string;
  slug: string;
  subservices: SubService[];
  path: string;
}

// Main services with their subservices
export const services: Service[] = [
  { 
    id: 1,
    name: 'Place & Things Rent-Buy-Sell',
    slug: 'rent-buy',
    subservices: [
      { id:1, name: 'Rent', description: 'Rent properties, vehicles, and items.'},
      { id:2, name: 'Buy', description: 'Buy properties, vehicles, and items.'},
    ],
    path: '/services/rent-buy',
  },
  // { 
  //   id: 2,
  //   name: 'Construction, Home Furniture',
  //   slug: 'home',
  //   subservices: [],
  //   path: '/services/home',
  // },
  // { 
  //   id: 3,
  //   name: 'e-Commerce',
  //   slug: 'ecommerce',
  //   subservices: [
  //     { id:1, name: 'Clothes' },
  //     { id:2, name: 'Grocery' },
  //     { id:3, name: 'Consumer Electronics' },
  //     { id:4, name: 'FMCG' },
  //     { id:5, name: 'Kitchen Ware' },
  //     { id:6, name: 'Beauty Product' },
  //     { id:7, name: 'Gardening' },
  //     { id:8, name: 'Shoes' },
  //     { id:9, name: 'Electronic components' },
  //     { id:10, name: 'Stationary' },
  //     { id:11, name: 'Furniture' },
  //   ],
  //   path: '/#',
  // },
  // { 
  //   id: 4,
  //   name: 'Utility Services',
  //   slug: 'utility',
  //   subservices: [
  //     { id:1, name: 'Plumber' },
  //     { id:2, name: 'Electrician' },
  //     { id:3, name: 'Gas Cylinder' },
  //     { id:4, name: 'Electricity Bill' },
  //     { id:5, name: 'Mobile Recharge' },
  //     { id:6, name: 'Laundry' },
  //   ],
  //   path: '/#',
  // },
  // { 
  //   id: 5,
  //   name: 'Location based Services',
  //   slug: 'location',
  //   subservices: [
  //     { id:1, name: 'Sports Gym' },
  //     { id:2, name: 'Swimming Pools' },
  //     { id:3, name: 'Gaming Cafe' },
  //     { id:4, name: 'Petrol Pumps' },
  //     { id:5, name: 'EV Chargers' },
  //   ],
  //   path: '/#',
  // },
  // { 
  //   id: 6,
  //   name: 'Orders Booking Travel Tickets',
  //   slug: 'travel',
  //   subservices: [
  //     { id:1, name: 'Food' },
  //     { id:2, name: 'Hotels' },
  //     { id:3, name: 'Taxi' },
  //     { id:4, name: 'Buses' },
  //     { id:5, name: 'Railway' },
  //     { id:6, name: 'Flight' },
  //     { id:7, name: 'Movie' },
  //     { id:8, name: 'Events' },
  //     { id:9, name: 'Jyotish' },
  //     { id:10, name: 'Bhajan Mandli' },
  //   ],
  //   path: '/#',
  // },
  // { 
  //   id: 7,
  //   name: 'Marriage, Events',
  //   slug: 'marriage',
  //   subservices: [
  //     { id:1, name: 'Find Bride', description: 'Assistance in finding suitable brides.' },
  //     { id:2, name: 'Find Groom', description: 'Assistance in finding suitable grooms.' },
  //     { id:3, name: 'Book Venue', description: 'Venue selection and booking for your wedding.' },
  //     { id:4, name: 'Catering', description: 'Professional catering services for wedding events.' },
  //     { id:5, name: 'Beauty Makeup', description: 'Professional beauty parlour services for bride and groom.' },
  //     { id:6, name: 'Decoration' },
  //     { id:7, name: 'Pandit' },
  //     { id:8, name: 'Band / DJ' },
  //     { id:9, name: 'Invitation Card' },
  //     { id:10, name: 'Photography' },
  //   ],
  //   path: '/services/marriage',
  // },
  // { 
  //   id: 8,
  //   name: 'Vehicle, Transport',
  //   slug: 'vehicle',
  //   subservices: [],
  //   path: '/services/vehicle',
  // },
  // { 
  //   id: 9,
  //   name: 'Medical, Health',
  //   slug: 'medical',
  //   subservices: [
  //     { id:1, name: 'Hospital Emergency' },
  //     { id:2, name: 'Consult Doctor' },
  //     { id:3, name: 'Medicines' },
  //     { id:4, name: 'Medical Equipments' },
  //     { id:5, name: 'Oxygen' },
  //     { id:6, name: 'Organ donation' },
  //     { id:7, name: 'Blood banks' },
  //     { id:8, name: 'Funeral Service' },
  //   ],
  //   path: '/#',
  // },
  // { 
  //   id: 10,
  //   name: 'Jobs, Career',
  //   slug: 'jobs',
  //   subservices: [
  //     { id:1, name: 'Home Tuition' },
  //     { id:2, name: 'Coaching Teacher' },
  //     { id:3, name: 'IT Programming' },
  //     { id:4, name: 'Guards' },
  //     { id:5, name: 'Salesman' },
  //     { id:6, name: 'Lawyer' },
  //     { id:7, name: 'Accountant' },
  //     { id:8, name: 'Managers' },
  //     { id:9, name: 'Engineer' },
  //     { id:10, name: 'Nurses' },
  //   ],
  //   path: '/#',
  // },
  // { 
  //   id: 11,
  //   name: 'Industrial Manufacturing',
  //   slug: 'industrial',
  //   subservices: [],
  //   path: '/services/industrial',
  // },
  // { 
  //   id: 12,
  //   name: 'Agriculture Farming',
  //   slug: 'agriculture',
  //   subservices: [],
  //   path: '/#',
  // },
  // { 
  //   id: 13,
  //   name: 'Advertise Design',
  //   slug: 'advertise',
  //   subservices: [
  //     { id:1, name: 'Upcoming Events' },
  //     { id:2, name: 'Newspaper Ads' },
  //     { id:3, name: 'Radio Ads' },
  //     { id:4, name: 'Digital Marketing' },
  //     { id:5, name: 'MobileApp' },
  //     { id:6, name: 'Pamphlet' },
  //     { id:7, name: 'Flex Print' },
  //     { id:8, name: 'LED display' },
  //   ],
  //   path: '/#',
  // },
  // { 
  //   id: 14,
  //   name: 'Blogs Courses',
  //   slug: 'blogs',
  //   subservices: [
  //     { id:1, name: 'Food' },
  //     { id:2, name: 'Travel' },
  //     { id:3, name: 'Art' },
  //     { id:4, name: 'Personal Devpt.' },
  //     { id:5, name: 'Technology' },
  //     { id:6, name: 'Gardening' },
  //     { id:7, name: 'Healthcare' },
  //   ],
  //   path: '/#',
  // },
];

// Helper function to get service by slug
export function getServiceBySlug(slug: string): Service | undefined {
  return services.find(service => service.slug === slug);
}

// Helper function to get service by path
export function getServiceByPath(path: string): Service | undefined {
  return services.find(service => service.path === path);
}
