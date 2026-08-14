import 'package:flutter/material.dart';
import 'package:reservation_app/pages/choose_location.dart';
// import 'pages/home.dart'; //import using relative path
import 'package:reservation_app/pages/home.dart';
import 'package:reservation_app/pages/loading.dart'; //import using package

void main() {
  runApp(MaterialApp(
    initialRoute: '/',//the loading page is the default landing page
    routes: {
      '/': (context)=>Loading(),
      '/home':(context)=>Home(),
      '/location':(context)=>ChooseLocation(),
    },
  ));
}


