// y
import React from 'react';
import Link from 'next/link'; // Import Link for navigation

export default function ServicesPage() {
  const pages = [   
    { id: 15, 
      name: 'Form Builder', 
      subservices: [''],
      path: '/forms' },
    { id: 16, 
      name: 'Prediction Votes', 
      subservices: [''],
      path: '/markets' }, 
  ]

  const services = [       
    { id: 3, 
      name: 'Place & Things Rent-Buy-Sell', 
      subservices: ['Rent','Buy'],
      path: '/services/rent-buy' },
    { id: 4, 
      name: 'Construction, Home Furniture', 
      subservices: [''],
      path: '/services/home' },
      { id: 9, 
      name: 'e-Commerce', 
      subservices: ['Clothes','Grocery','Consumer Electronics','FMCG',
        'Kitchen Ware','Beauty Product','Gardening',
        'Shoes','Electronic compontents','Stationary','Furniture'],
      path: '/#' },
    { id: 11, 
      name: 'Utility Services', 
      subservices: ['Plumber','Electrician','Gas Cylinder',
        'Electricity Bill','Mobile Recharge','Laundary'],
      path: '/#' },
    
    { id: 7, 
      name: 'Location based Services', 
      subservices: ['Sports Gym','Swimming Pools','Gaming Cafe',
        'Petrol Pumps','EV Chargers'],
      path: '/#' },        
    { id: 8, 
      name: 'Orders Booking Travel Tickets', 
      subservices: ['Food','Hotels','Taxi','Buses','Railway','Flight'
        ,'Movie','Events','Jyotish','Bhajan Mandli'],
      path: '/#' },
      { id: 1, 
      name: 'Marriage, Events', 
      subservices: [''],
      path: '/services/marriage' },
    { id: 2, 
      name: 'Vehicle, Transport', 
      subservices: [''],
      path: '/services/vehicle' },    
    { id: 12, 
      name: 'Medical, Health', 
      subservices: ['Hospital Emergency','Consult Doctor','Medicines',
        'Medical Equipments','Oxygen','Organ donation',
        'Blood banks','Funeral Service'],
      path: '/#' },
    { id: 13, 
      name: 'Jobs, Career', 
      subservices: ['Home Tution','Coaching Teacher','IT Programming',
        'Guards','Salesman','Lawyer','Accountant',
        'Managers','Engineer','Nurses'],
      path: '/#' },
      { id: 5, 
      name: 'Industrial Manufacturing', 
      subservices: [''],
      path: '/services/industrial' },  
    { id: 6, 
      name: 'Agriculture Farming', 
      subservices: [''],
      path: '/#' }, 
    { id: 14, 
      name: 'Advertise Design', 
      subservices: ['Upcoming Events','Newspaper Ads','Radio Ads',
        'Digital Marketing','MobileApp','Pamphlet',
        'Flex Print','LED display'],
      path: '/#' },
    { id: 10, 
      name: 'Blogs Courses', 
      subservices: ['Food','Travel','Art','Personal Devpt.',
        'Technology','Gardening','Healthcare'],
      path: '/#' }, 
  ];

  return (
    <div className="container mx-auto p-2">
      <h1 className="text-center text-xl text-gray-400 font-bold mb-3">Add your Service to start earning.</h1>

      {services.length === 0 ? (
        <p>No services currently available.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {pages.map((service) => (
            <div key={service.id} className="flex items-center justify-center bg-gray-600 rounded-full shadow-md">
              <Link href={service.path} className="block group">
                <h2 className="text-center text-3xm font-semibold mb-2 text-gray-300 mt-2">{service.name}</h2>
              </Link>              
            </div>
          ))}
          {services.map((service) => (
            <div key={service.id} className="flex items-center justify-center bg-gray-900 rounded-lg shadow-md p-2">
              <Link href={service.path} className="block group">
                <h2 className="text-center text-3xm font-semibold mb-2 text-gray-300">{service.name}</h2>
              </Link>              
            </div>
          ))}
        </div>
      )}
    </div>
  );
}