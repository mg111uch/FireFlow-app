let order_size, delivery_fee, gig_distance 

const Platform_Fee = 15
const fee_switch_order_size = 400
if(order_size < fee_switch_order_size){
    delivery_fee = 25
}else{
    delivery_fee = 50
}

const base_distance = 3
const base_ride_fee = 75 
const per_km_ride_fee = 25 

var total_ride_fee = base_ride_fee + (gig_distance - base_distance) * per_km_ride_fee


const driver_payout = 0.8 * total_ride_fee