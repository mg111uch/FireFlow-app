interface PriceParams {
  type: 'ride' | 'delivery';
  vehicle_type: string;
  distance: number;
  passengers?: number;
  order_size?: number;
}

export function calculatePrice(params: PriceParams): number {
  const { type, vehicle_type, distance, passengers = 1, order_size = 200 } = params;
  
  if (type === 'ride') {
    return calculateRidePrice(vehicle_type, distance, passengers);
  } else {
    return calculateDeliveryPrice(vehicle_type, distance, order_size);
  }
}

function calculateRidePrice(vehicle_type: string, distance: number, passengers: number): number {
  let baseDistance = 3;
  let baseFee = 75;
  let perKmRate = 25;
  
  switch (vehicle_type) {
    case 'Bike-Taxi':
      baseFee = 50;
      perKmRate = 15;
      baseDistance = 2;
      break;
    case 'Auto':
      baseFee = 75;
      perKmRate = 20;
      baseDistance = 3;
      break;
    case 'Cab Economy':
      baseFee = 100;
      perKmRate = 25;
      baseDistance = 3;
      break;
    case 'Cab Premium':
      baseFee = 150;
      perKmRate = 35;
      baseDistance = 3;
      break;
  }
  
  if (vehicle_type === 'Bike-Taxi' && passengers > 1) {
    baseFee += 20;
  }
  
  if (distance <= baseDistance) {
    return baseFee;
  }
  
  return baseFee + Math.round((distance - baseDistance) * perKmRate);
}

function calculateDeliveryPrice(vehicle_type: string, distance: number, order_size: number): number {
  let deliveryFee = 50;
  const Platform_Fee = 15
  let perKmRate = 15;
  
  switch (vehicle_type) {
    case 'Bike':      
      const fee_switch_order_size = 400
      if(order_size < fee_switch_order_size){
          deliveryFee = 25
      }else{
          deliveryFee = 50
      }
      perKmRate = 10;
      break;
    case 'Mini-Loader':
      deliveryFee = 150;
      perKmRate = 20;
      break;
    case 'Tempo':
      deliveryFee = 300;
      perKmRate = 25;
      break;
    case 'Truck':
      deliveryFee = 500;
      perKmRate = 30;
      break;
  }
  
  return Platform_Fee + deliveryFee + Math.round(distance * perKmRate);
}