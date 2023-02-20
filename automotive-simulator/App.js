import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, TouchableOpacity, StyleSheet, ImageBackground, Text, View, Alert, Button, TextInput, Linking, ScrollView } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AntDesign from 'react-native-vector-icons/AntDesign';
import MapView, {Marker} from 'react-native-maps';

import * as Application from 'expo-application';
import { Platform } from 'expo-modules-core';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

import {createBottomTabNavigator, useBottomTabBarHeight } from '@react-navigation/bottom-tabs'
import { NavigationContainer } from '@react-navigation/native';

import * as Sentry from 'sentry-expo';

Sentry.init({
  dsn: 'https://b0336f5089eb46ceb5a6b890d36b3435@o996231.ingest.sentry.io/4504713968025600',
  enableInExpoDevelopment: true,
  debug: false, // If `true`, Sentry will try to print out useful debugging information if something goes wrong with sending the event. Set it to `false` in production
});

HomeScreen = () => {
  const [trips, setTrips] = useState([]);
  const [isLoading, setLoading] = useState(true);
  const [triggerRefresh, setTriggerRefresh] = useState(false)

  useEffect(() => {
    fetch('http://HOST/events/get', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        device: Application.androidId,
      })
    })
      .then((response) => response.json())
      .then((json) => setTrips(json))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false));
  }, [triggerRefresh]);

  if (isLoading) {
    return (<Text>Loading...</Text>);
  }

  if (trips.length === 0) {
    return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          { 
            trips.length === 0 &&
            <>
              <Text style={{textAlign: 'center' }}>You don't have any trips recorded.</Text>
              <Text style={{textAlign: 'center' }}>Please use the simulation tab for creating one.</Text>
            </>
          }
        </View>
    );
  }
  return (
    <ScrollView>
        {
          Object.keys(trips).map((item, i) => {
            const starColor = trips[item][0].RideScore < 20 ? 'red' : (trips[item][0].RideScore < 60 ? 'tomato' : (trips[item][0].RideScore < 80 ? 'yellow' : 'green'));
            const star1Icon = trips[item][0].RideScore > 20 ? 'star' : 'staro';
            const star2Icon = trips[item][0].RideScore > 40 ? 'star' : 'staro';
            const star3Icon = trips[item][0].RideScore > 60 ? 'star' : 'staro';
            const star4Icon = trips[item][0].RideScore > 80 ? 'star' : 'staro';
            const star5Icon = trips[item][0].RideScore > 90 ? 'star' : 'staro';
            
            return (
            <View key={i}>
              <ImageBackground
              style={{margin: 30, padding: 30, borderRadius: 30, shadowColor: "#000", shadowOffset: { width: 0, height: 4,}, shadowOpacity: 0.32, shadowRadius: 5.46, overflow: 'hidden'}}
                
                //We are using online image to set background
                source={{
                  uri:
                    'https://img.freepik.com/free-vector/gradient-black-background-with-wavy-lines_23-2149157315.jpg?w=2000&t=st=1676895696~exp=1676896296~hmac=c07cb2fca2b56b0be1d052d5a90fa7ebeb9c5f3dee7b4df91bdf35f72613a53e',
                }}
              >
                <View >
                  <Text style={{color: 'white', fontSize: 16}}>Trip #{item}</Text>
                  <Text style={{color: 'white', fontSize: 16}}>Start date: {trips[item][0].RideStartDate}</Text>
                  <Text style={{color: 'white', fontSize: 16}}>End date: {trips[item][0].RideEndDate}</Text>
                  <Text style={{color: 'white', fontSize: 16}}>Distance: {trips[item][0].RideDistance}</Text>
                  <Text style={{color: 'white', fontSize: 16}}>Score: 
                    <AntDesign name={star1Icon} size={15} color={starColor} />
                    <AntDesign name={star2Icon} size={15} color={starColor} />
                    <AntDesign name={star3Icon} size={15} color={starColor} />
                    <AntDesign name={star4Icon} size={15} color={starColor} />
                    <AntDesign name={star5Icon} size={15} color={starColor} /> 
                  </Text>
                </View>
              </ImageBackground>
            </View>);
          })
        }
    </ScrollView>
  );
}

function SimulationScreen() {
  const [isSimulationOpened, setSimulationOpen] = useState(false);
  const [isSimulationStarted, setSimulationStarted] = useState(false);
  const [simulationOption, setSimulationOption] = useState(null);

  const [markers, setMarkers] = useState([]);
  const [colorBtnStartSimulation, setColorBtnStartSimulation] = useState('tomato');
  const [textButtonSimulation, setTextButtonSimulation] = useState('Start');

  let indexPoint = -1;
  addPointRemote = (point) => {
    // const getDeviceId = async () => {
    //   if (Platform.OS === 'android') {
    //     return Application.androidId;
    //   } else {
    //     let deviceId = await SecureStore.getItemAsync('deviceId');
    
    //     if (!deviceId) {
    //       deviceId = Constants.deviceId; //or generate uuid
    //       await SecureStore.setItemAsync('deviceId', deviceId);
    //     }
    
    //     return deviceId;
    //   }
    // }

    const body = JSON.stringify({
      'device': Application.androidId,
      x: point[0],
      y: point[1],
      createdAt: Math.floor(Date.now() / 1000),
    });
    console.log(body)
    fetch('http://host/events/create', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: body
    });
  }
  const addPoint = () => {
    let futureIndexPoint = indexPoint + 1;
    indexPoint = futureIndexPoint;
    let inputArray = simulationOne
    if (simulationOption != 1) {
      inputArray = simulationTwo;
    }
    
    setMarkers(markers => [...markers, inputArray[indexPoint]]);
    if (inputArray[futureIndexPoint]) {
      setTextButtonSimulation('Simulation in progress.')
      setTimeout(addPoint, 1000);
      addPointRemote(inputArray[indexPoint]);
    } else {
      setTextButtonSimulation('Simulation has ended. Please return back to the home menu to see the results.');
      setTimeout(() => {setSimulationOpen(false);}, 2500);
    }
  }
  const simulationTwo = [
    [44.437266,26.125474],
    [44.437503,26.125330],
    [44.437768,26.125346],
    [44.438028,26.125362],
    [44.438400,26.125387],
    [44.438542,26.125075],
    [44.438588,26.124705],
    [44.438672,26.124276],
    [44.438741,26.123906],
    [44.438798,26.123568],
    [44.438867,26.123171],
    [44.438921,26.122881],
    [44.439185,26.122651],
    [44.439304,26.122962],
    [44.439369,26.123343],
    [44.439450,26.123782],
    [44.439561,26.124237],
    [44.439806,26.124291],
    [44.440028,26.124248],
    [44.440288,26.124232],
    [44.440537,26.124194],
    [44.440778,26.124162],
    [44.441000,26.124130],
    [44.441265,26.124093],
    [44.441487,26.124329],
    [44.441682,26.124575],
    [44.441816,26.124854],
    [44.441946,26.125128],
    [44.442084,26.125428],
    [44.442192,26.125713],
    [44.442319,26.126020],
    [44.442439,26.126328],
    [44.442631,26.126666],
    [44.442811,26.126985],
    [44.442951,26.127336],
    [44.443100,26.127703],
    [44.443255,26.128097],
    [44.443388,26.128389],
    [44.443510,26.128676],
    [44.443626,26.128982],
    [44.443778,26.129279],
    [44.443963,26.129001],
    [44.444185,26.128755],
    [44.444374,26.128403],
    [44.444572,26.128180],
    [44.444801,26.127934],
    [44.445009,26.127707],
    [44.445221,26.127522],
    [44.445426,26.127374],
    [44.445658,26.127197],
    [44.445886,26.127017],
    [44.446189,26.126779],
    [44.446392,26.126651],
    [44.446607,26.126523],
    [44.446860,26.126412],
    [44.447094,26.126310],
    [44.447325,26.126230],
    [44.447569,26.126164],
    [44.447752,26.126089],
    [44.447980,26.126000],
    [44.448214,26.125889],
    [44.448432,26.125765],
    [44.448654,26.125597],
    [44.448891,26.125389],
    [44.449081,26.125203],
    [44.449293,26.124972],
    [44.449489,26.124791],
    [44.449675,26.124600],
    [44.449868,26.124405],
    [44.450109,26.124135],
    [44.450270,26.123918],
    [44.450425,26.123692],
    [44.450586,26.123475],
    [44.450744,26.123258],
    [44.450912,26.123005],
    [44.451076,26.122726],
    [44.451222,26.122425],
    [44.451348,26.122190],
    [44.451472,26.121920],
    [44.451592,26.121583],
    [44.451693,26.121251],
    [44.451785,26.121033],
    [44.451851,26.120777],
    [44.451933,26.120511],
    [44.452006,26.120165],
    [44.452123,26.119740],
    [44.452193,26.119430],
    [44.452247,26.119177],
    [44.452310,26.118916],
    [44.452379,26.118579],
    [44.452439,26.118220],
    [44.452462,26.117875],
    [44.452544,26.117542],
    [44.452575,26.117197],
    [44.452610,26.116838],
    [44.452651,26.116443],
    [44.452705,26.116016],
    [44.452715,26.115709],
    [44.452747,26.115372],
    [44.452794,26.114934],
    [44.452828,26.114499],
    [44.452879,26.114021],
    [44.452904,26.113622],
    [44.452926,26.113281],
    [44.452952,26.112931],
    [44.452968,26.112581],
    [44.452971,26.112244],
    [44.452974,26.111894],
    [44.452980,26.111637],
    [44.452993,26.111331],
    [44.452977,26.110995],
    [44.452986,26.110667],
    [44.453005,26.110339],
    [44.453012,26.110011],
    [44.453021,26.109639],
    [44.453034,26.109298],
    [44.453024,26.108939],
    [44.453024,26.108589],
    [44.453018,26.108195],
    [44.453037,26.107836],
    [44.453040,26.107472],
    [44.453050,26.107127],
    [44.453018,26.106759],
    [44.453024,26.106471],
    [44.453060,26.106139],
    [44.453063,26.105787],
    [44.453063,26.105401],
    [44.453052,26.104983],
    [44.453063,26.104591],
    [44.453079,26.104232],
    [44.453052,26.103883],
    [44.453052,26.103491],
    [44.453063,26.103116],
    [44.453075,26.102778],
    [44.453071,26.102413],
    [44.453079,26.102038],
    [44.453082,26.101683],
    [44.453102,26.101346],
    [44.453094,26.100916],
    [44.453327,26.100820],
    [44.453599,26.100793],
    [44.453910,26.100777],
    [44.454174,26.100750],
    [44.454449,26.100755],
    [44.454686,26.100748],
    [44.454948,26.100726],
    [44.455189,26.100721],
    [44.455468,26.100700],
    [44.455714,26.100689],
    [44.455962,26.100684],
    [44.456192,26.100662],
    [44.456422,26.100646],
    [44.456694,26.100636],
    [44.456974,26.100636],
    [44.457266,26.100601],
    [44.457523,26.100581],
    [44.457795,26.100565],
    [44.458082,26.100549],
    [44.458506,26.100653],
    [44.458808,26.100707],
    [44.459130,26.100749],
    [44.459391,26.100824],
    [44.459686,26.100872],
    [44.460023,26.100947],
    [44.460261,26.100995],
    [44.460479,26.101033],
    [44.460999,26.101143],
    [44.461244,26.101185],
    [44.461459,26.101232],
    [44.461684,26.101278],
    [44.461916,26.101310],
    [44.462229,26.101374],
    [44.462435,26.101393],
    [44.462633,26.101421],
    [44.462835,26.101472],
    [44.463073,26.101513],
    [44.463301,26.101560],
    [44.463523,26.101592],
    [44.463794,26.101634],
    [44.463975,26.101666],
    [44.464200,26.101714],
    [44.464442,26.101757],
    [44.464652,26.101795],
    [44.464920,26.101843],
    [44.465146,26.101897],
    [44.465286,26.101918],
    [44.465511,26.101989],
    [44.465783,26.102032],
    [44.466013,26.102070],
    [44.466277,26.102064],
    [44.466530,26.102166],
    [44.466826,26.102217],
    [44.467068,26.102310],
    [44.467266,26.102407],
    [44.467442,26.102523],
    [44.467607,26.102625],
    [44.467786,26.102750],
    [44.468004,26.102894],
    [44.468193,26.103042],
    [44.468385,26.103177],
    [44.468593,26.103297],
    [44.469022,26.103587],
    [44.469102,26.103663],
    [44.469308,26.103784],
    [44.469476,26.103886],
    [44.469671,26.104006],
    [44.469890,26.104136],
    [44.470092,26.104252],
    [44.470330,26.104354],
    [44.470518,26.104512],
    [44.470730,26.104609],
    [44.470945,26.104702],
    [44.471130,26.104845],
    [44.471319,26.104957],
    [44.471524,26.105063],
    [44.471712,26.105156],
    [44.471914,26.105267],
    [44.472096,26.105341],
    [44.472295,26.105402],
    [44.472503,26.105406],
    [44.472741,26.105374],
    [44.472946,26.105304],
    [44.473161,26.105221],
    [44.473363,26.105147],
    [44.473588,26.105049],
    [44.473786,26.104957],
    [44.473975,26.104892],
    [44.474177,26.104753],
    [44.474359,26.104609],
    [44.474554,26.104479],
    [44.474756,26.104326],
    [44.474987,26.104178],
    [44.475186,26.104016],
    [44.475368,26.103886],
    [44.475576,26.103728],
    [44.475791,26.103580],
    [44.475979,26.103464],
    [44.476181,26.103380],
    [44.476436,26.103260],
    [44.476618,26.103098],
    [44.476833,26.103065],
    [44.477048,26.102954],
    [44.477246,26.102843],
    [44.477438,26.102741],
    [44.477620,26.102884]
  ];
  const simulationOne = [
    [44.466892, 26.078193],
    [44.466678, 26.078344],
    [44.466465,	26.078493],
    [44.466427,	26.078511],
    [44.466226,	26.078612],
    [44.465969,	26.078747],
    [44.465720,	26.078872],
    [44.465476,	26.078991],
    [44.465239,	26.079109],
    [44.464999,	26.079223],
    [44.464704,	26.079356],
    [44.464408,	26.079501]
  ];
  const startSimulation = (number) => {
    console.log('ddd', number)
    setSimulationStarted(true);
    setColorBtnStartSimulation('black');
    indexPoint = 0;
    addPoint();
  }

  let latMap = 44.466892;
  let longMap = 26.080193;
  let latDelta = 0.0082;
  let longDelta =  0.0081;

  if (isSimulationOpened) {
    if (simulationOption != 1) {
      latMap = 44.471712;
      longMap = 26.105156;
      latDelta = 0.0182;
      longDelta =  0.0181;
    }
    console.log('asd', simulationOption)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <MapView 
          style={{width: '100%', height: "100%"}}
          initialRegion={{
            latitude: latMap,
            longitude: longMap,
            latitudeDelta: latDelta,
            longitudeDelta: longDelta,
          }}
        >
          {markers.map(
            (marker, index) => {
              if (marker){ 
                return (
                  <Marker
                    key={index}
                    coordinate={{
                      latitude: marker[0],
                      longitude: marker[1]
                    }}
                    title={(index + 1).toString()}
                  />
                );
              }
            }
          )}
        </MapView>
        <TouchableOpacity 
          disabled={isSimulationStarted}
          style={{position: 'absolute', bottom: 70}}
          onPress={() => startSimulation(simulationOption)}
        >
          <Text style={{color: 'white', backgroundColor: colorBtnStartSimulation, borderRadius: 20, fontSize: 18, lineHeight: 18, width: 150, padding: 10, textAlign: 'center'}}>{textButtonSimulation}</Text>
        </TouchableOpacity>
      </View>
    );
  }
  return (
    <>
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => {setSimulationOpen(true); setSimulationOption(1)}} color='tomato' title='Simulate a ride on the "Bulevardul Regele Mihai I"'/>
    </View>
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button style={{marginTop: 50}} onPress={() => {setSimulationOpen(true); setSimulationOption(2); }} color='tomato' title='Simulate a ride in "Piata Bucur Obor" area'/>
    </View>
    </>
  );
}

export default () => {
  const [user, setUser] = useState(undefined);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const image = { uri: "https://docs.expo.dev/static/images/tutorial/splash.png" };

  const Tab = createBottomTabNavigator();

  const onLogin = () => {
    if (username != 'Auto' || password != 'a') {
      Alert.alert('User not found', `${username}`);
    } else {
      setUser('automotive');
    }
  }

  if (user === undefined) {
    return (
      <SafeAreaView style={styles.container}>
        <ImageBackground
          style={{ flex: 1 }}
          //We are using online image to set background
          source={{
            uri:
              'https://img.freepik.com/free-vector/abstract-business-professional-background-banner-design-multipurpose_1340-16858.jpg?w=1800&t=st=1676752102~exp=1676752702~hmac=28d89983c8a11679e7ac26103bc3f17a8ccd6415a52f98605d7a573ad39a2edf',
          }}
        >
          <View style={styles.loginContainer}>
              <Text style={{fontSize: 20, fontWeight: 'bold', color: '#aeaeae', position: 'absolute', top: 100}}>
                Automotive Technology Solutions
              </Text>
              <TextInput
                value={username}
                onChangeText={(username) => setUsername(username)}
                placeholder={'Username'}
                placeholderTextColor='#fff'
                style={styles.input}
              />
              <TextInput
                value={password}
                onChangeText={(password) => setPassword(password)}
                placeholder={'Password'}
                placeholderTextColor='#fff'
                secureTextEntry={true}
                style={styles.input}
              />
              
              <Button
                title={'Login'}
                style={styles.input}
                onPress={onLogin}
              />
              <Text
                style={{position: 'absolute', bottom: 10, color: '#aeaeae'}} 
                onPress={() => Linking.openURL('https://www.freepik.com/free-vector/abstract-business-professional-background-banner-design-multipurpose_23485395.htm#query=background&position=3&from_view=keyword&track=sph')}
              >
                Image by Sketchepedia on Freepik
              </Text>
          </View>
        </ImageBackground>
      </SafeAreaView>
    );
  }
  return (
    <NavigationContainer>
      <Tab.Navigator screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === 'Home') {
              iconName = 'dashboard'
            } else if (route.name === 'Simulate') {
              iconName = 'car';
            }

            // You can return any component that you like here!
            return <AntDesign name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: 'tomato',
          tabBarInactiveTintColor: 'gray',
        })}>
        <Tab.Screen name="Home" component={HomeScreen} options={{unmountOnBlur: true}}  />
        <Tab.Screen name="Simulate" component={SimulationScreen} options={{unmountOnBlur: true}} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  input: {
    width: '60%',
    backgroundColor: 'rgba(85, 197, 255, 0.2)', 
    color: 'white',
    marginTop: 10,
    marginBottom: 10,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 20,
    textAlign: 'center',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#2b5687',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.32,
    shadowRadius: 5.46,

    elevation: 9,
  }
});
