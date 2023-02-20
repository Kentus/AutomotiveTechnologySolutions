package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/confluentinc/confluent-kafka-go/kafka"
	"log"
	"net/http"
	"os"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

type GpsEvent struct {
	X         float32
	Y         float32
	CreatedAt int64
	Device    string
}

type Event struct {
	RideId        int64
	RideStartDate time.Time
	RideEndDate   time.Time
	RideDistance  float64
	RideScore     float64
	EventId       int64
	Latitude      float64
	Longitude     float64
	CreatedAt     time.Time
	Device        string
	Speed         float64
	MaxSpeed      float64
}

type InputEventList struct {
	Device string
}

func eventList(w http.ResponseWriter, r *http.Request) {
	var inputParam InputEventList

	// Try to decode the request body into the struct. If there is an error,
	// respond to the client with the error message and a 400 status code.
	err := json.NewDecoder(r.Body).Decode(&inputParam)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	db, err := sql.Open("mysql", "SECRET@tcp(HOST:3306)/DB?parseTime=true")
	defer db.Close()

	if err != nil {
		log.Fatal(err)
	}

	res, err2 := db.Query("SELECT r.id, e.id, r.score, r.distance, r.start_date, r.end_date, e.latitude, e.longitude, e.device, e.created_at, e.speed, e.max_speed from ride r inner join event e on e.ride_id = r.id where e.device = ?", inputParam.Device)

	if err2 != nil {
		log.Fatal(err2)
	}

	events := map[int64][]Event{}
	for res.Next() {
		var event Event
		err := res.Scan(&event.RideId, &event.EventId, &event.RideScore, &event.RideDistance, &event.RideStartDate, &event.RideEndDate, &event.Latitude, &event.Longitude, &event.Device, &event.CreatedAt, &event.Speed, &event.MaxSpeed)

		if err != nil {
			log.Fatal(err)
		}

		fmt.Printf("%v\n", event)
		events[event.RideId] = append(events[event.RideId], event)
	}
	w.Header().Set("Content-Type", "application/json")
	fmt.Println(json.NewEncoder(w).Encode(events))
}

func eventCreate(w http.ResponseWriter, r *http.Request) {
	// Declare a new Person struct.
	var event GpsEvent

	// Try to decode the request body into the struct. If there is an error,
	// respond to the client with the error message and a 400 status code.
	err := json.NewDecoder(r.Body).Decode(&event)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	if event.CreatedAt == 0 || event.Device == "" || event.X == 0 || event.Y == 0 {
		http.Error(w, "Invalid body", http.StatusBadRequest)
		return
	}

	hostname, err := os.Hostname()
	if err != nil {
		fmt.Println(err)
		os.Exit(1)
	}

	p, err := kafka.NewProducer(&kafka.ConfigMap{
		"bootstrap.servers": "192.168.0.131:9092,192.168.0.197:9092,192.168.0.188:9092",
		"client.id":         hostname,
		"acks":              "all"})

	if err != nil {
		fmt.Printf("Failed to create producer: %s\n", err)
		os.Exit(1)
	}

	// Do something with the Person struct...
	fmt.Fprintf(w, "Event: %+v", p)

	topic := "events"
	cmtInBytes, err := json.Marshal(event)

	deliveryChan := make(chan kafka.Event, 10000)
	err = p.Produce(&kafka.Message{
		TopicPartition: kafka.TopicPartition{Topic: &topic, Partition: kafka.PartitionAny},
		Value:          []byte(cmtInBytes)},
		deliveryChan)

	e := <-deliveryChan
	m := e.(*kafka.Message)

	if m.TopicPartition.Error != nil {
		fmt.Printf("Delivery failed: %v\n", m.TopicPartition.Error)
	} else {
		fmt.Printf("Delivered message to topic %s [%d] at offset %v\n",
			*m.TopicPartition.Topic, m.TopicPartition.Partition, m.TopicPartition.Offset)
	}
	close(deliveryChan)
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/events/create", eventCreate)
	mux.HandleFunc("/events/get", eventList)

	err := http.ListenAndServe(":4000", mux)
	log.Fatal(err)
}
