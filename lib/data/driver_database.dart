import '../models/driver.dart';

class DriverDatabase {
  static List<Driver> drivers = [
    Driver(
      name: "Rahul Sharma",
      phone: "+91 98765 43210",
      vehicleType: "Toyota Innova Crysta",
      vehicleNumber: "AP16FF4912",
      rating: 4.9,
      eta: "4 min",
      fare: 450,
    ),
    Driver(
      name: "Ravi Kumar",
      phone: "+91 91234 56789",
      vehicleType: "Car",
      vehicleNumber: "TS09AB1234",
      rating: 4.8,
      eta: "6 min",
      fare: 380,
    ),
    Driver(
      name: "Siddharth Verma",
      phone: "+91 99887 76655",
      vehicleType: "SUV",
      vehicleNumber: "TS07XY9988",
      rating: 4.7,
      eta: "8 min",
      fare: 620,
    ),
    Driver(
      name: "Amit Patel",
      phone: "+91 98112 23344",
      vehicleType: "Car",
      vehicleNumber: "TS08CD5678",
      rating: 4.6,
      eta: "11 min",
      fare: 350,
    ),
  ];
}