package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/confluentinc/confluent-kafka-go/kafka"
	"log"
	"os"
	"strconv"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

type GpsEvent struct {
	X         float32
	Y         float32
	CreatedAt int64
	Device    string
}

func main() {
	topic := []string{"events"}

	consumer, err := kafka.NewConsumer(&kafka.ConfigMap{
		"bootstrap.servers": "192.168.0.131:9092,192.168.0.197:9092,192.168.0.188:9092",
		"group.id":          "foo",
		"auto.offset.reset": "smallest"})

	if err != nil {
		fmt.Printf("Failed to create consumer: %s\n", err)
		os.Exit(1)
	}

	err = consumer.SubscribeTopics(topic, nil)

	run := true
	var event GpsEvent

	db, err := sql.Open("mysql", "SECRET@tcp(HOST:3306)/DB?parseTime=true")
	defer db.Close()

	if err != nil {
		log.Fatal(err)
	}

	for run == true {
		ev := consumer.Poll(100)
		switch e := ev.(type) {
		case *kafka.Message:
			// application-specific processing
			fmt.Fprintf(os.Stderr, "Event: %+v", string(e.Value))
			err := json.Unmarshal(e.Value, &event)
			if err != nil {
				fmt.Fprintf(os.Stderr, "Event: %+v", err.Error())
				return
			}
			fmt.Fprintf(os.Stderr, "Event: %+v", event)

			createdAtTime, err := strconv.ParseInt(strconv.FormatInt(event.CreatedAt, 10), 10, 64)
			if err != nil {
				panic(err)
			}
			tm := time.Unix(createdAtTime, 0)

			query := "INSERT INTO event (latitude, longitude, device, created_at, max_speed) VALUES (?,?,?,?, 60)"
			insertResult, err := db.ExecContext(context.Background(), query, event.X, event.Y, event.Device, tm)
			if err != nil {
				log.Fatalf("impossible insert event: %s", err)
			}
			id, err := insertResult.LastInsertId()
			if err != nil {
				log.Fatalf("impossible to retrieve last inserted id: %s", err)
			}
			log.Printf("inserted id: %d", id)
		case kafka.Error:
			_, _ = fmt.Fprintf(os.Stderr, "%% Error: %v\n", e)
			run = false
		default:
			fmt.Printf("Ignored %v\n", e)
		}
	}

	_ = consumer.Close()
}
