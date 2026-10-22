import 'package:flutter/material.dart';
import 'package:http/http.dart';
import 'dart:convert';

class Loading extends StatefulWidget {
  const Loading({super.key});

  @override
  State<Loading> createState() => _LoadingState();
}

class _LoadingState extends State<Loading> {
  void getData() async{
    // Fetch data form api
    Response response = await get(Uri.parse('https://jsonplaceholder.typicode.com/todos/1'));
    // print(response.body);
    Map data = jsonDecode(response.body); //parse the recieved sting into Json data
    print(data);
    print(data['title']);
  }

  @override
  void initState() {
    super.initState();
    getData(); // invoke the getData method that fetches data from API
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Text("Loading screen"),
    );
  }
}