package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"math"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

type Event struct {
	Id        int64
	Latitude  float32
	Longitude float32
	CreatedAt time.Time
	Device    string
	Speed     sql.NullFloat64
	MaxSpeed  float64
	RideId    sql.NullInt32
}

func main() {
	db, err := sql.Open("mysql", "SECRET@tcp(HOST:3306)/DB?parseTime=true")
	defer db.Close()

	if err != nil {
		log.Fatal(err)
	}

	res, err2 := db.Query("SELECT id, latitude, longitude, device, created_at, speed, max_speed, ride_id from event where ride_id is null")

	if err2 != nil {
		log.Fatal(err2)
	}

	deviceEvents := map[string][]Event{}
	groupedEvents := map[string][]map[int][]Event{}
	for res.Next() {
		var event Event
		err := res.Scan(&event.Id, &event.Latitude, &event.Longitude, &event.Device, &event.CreatedAt, &event.Speed, &event.MaxSpeed, &event.RideId)

		if err != nil {
			log.Fatal(err)
		}

		deviceEvents[event.Device] = append(deviceEvents[event.Device], event)
	}

	for device := range deviceEvents {
		tempRides := map[int][]Event{}

		for _, event := range deviceEvents[device] {
			if len(tempRides) == 0 {
				tempRides[0] = append(tempRides[0], event)
			} else {
				isUsed := false
				for tempRide := range tempRides {
					maxDeltaTime := event.CreatedAt.Add(-1 * time.Minute)
					if tempRides[tempRide][len(tempRides[tempRide])-1].CreatedAt.After(maxDeltaTime) {
						tempRides[tempRide] = append(tempRides[tempRide], event)
						isUsed = true
						break
					}
				}
				if isUsed == false {
					tempRides[len(tempRides)] = append(tempRides[len(tempRides)], event)
				}
			}
		}

		groupedEvents[device] = append(groupedEvents[device], tempRides)
	}

	for device := range groupedEvents {
		for ride := range groupedEvents[device] {
			var lastRideId int
			distance := 0.00

			if err := db.QueryRow("SELECT max(ride_id) from event where device = ?", device).Scan(&lastRideId); err != nil {
				if err == sql.ErrNoRows {
					lastRideId = 0
				}
			}

			if err2 != nil {
				log.Fatal(err2)
			}

			for iRide, events := range groupedEvents[device][ride] {
				score := 100
				scoreTreshold := 50 / len(events)

				query := "INSERT INTO ride (start_date, end_date, score, distance) VALUES (?,?,?,?)"
				insertResult, err := db.ExecContext(context.Background(), query, nil, nil, nil, nil)
				if err != nil {
					log.Fatalf("impossible insert ride: %s", err)
				}
				id, err := insertResult.LastInsertId()
				if err != nil {
					log.Fatalf("impossible to retrieve last inserted id: %s", err)
				}
				log.Printf("inserted id: %d", id)

				for iEvent := range events {
					groupedEvents[device][ride][iRide][iEvent].RideId = sql.NullInt32{Int32: int32(id), Valid: true}
					groupedEvents[device][ride][iRide][iEvent].Speed = sql.NullFloat64{Valid: true}

					if iEvent != 0 {
						dist := distance_on_geoid(
							float64(events[iEvent-1].Latitude),
							float64(events[iEvent-1].Longitude),
							float64(events[iEvent].Latitude),
							float64(events[iEvent].Longitude))

						distance += dist

						difference := events[iEvent].CreatedAt.Sub(events[iEvent-1].CreatedAt)
						timeS := difference.Seconds()
						speedMps := dist / timeS
						speedKph := (speedMps * 3600.0) / 1000.0

						if speedKph > events[iEvent].MaxSpeed {
							if speedKph < (events[iEvent].MaxSpeed + 10) {
								score -= scoreTreshold
							} else {
								score -= 2 * scoreTreshold
							}
						}
						groupedEvents[device][ride][iRide][iEvent].Speed = sql.NullFloat64{Float64: speedKph, Valid: true}
					}
					insForm, err := db.Prepare("UPDATE event SET ride_id=?, speed=? WHERE id=?")
					if err != nil {
						panic(err.Error())
					}
					insForm.Exec(groupedEvents[device][ride][iRide][0].RideId, groupedEvents[device][ride][iRide][iEvent].Speed, groupedEvents[device][ride][iRide][iEvent].Id)
				}

				insForm, err := db.Prepare("UPDATE ride SET start_date=?, end_date=?, score=?, distance=? WHERE id=?")
				if err != nil {
					panic(err.Error())
				}
				insForm.Exec(groupedEvents[device][ride][iRide][0].CreatedAt, groupedEvents[device][ride][iRide][len(groupedEvents[device][ride][iRide])-1].CreatedAt, score, distance, id)
			}
		}
	}

	fmt.Println(groupedEvents)
}

func distance_on_geoid(lat1 float64, lon1 float64, lat2 float64, lon2 float64) float64 {
	// Convert degrees to radians
	lat1 = lat1 * math.Pi / 180.0
	lon1 = lon1 * math.Pi / 180.0
	lat2 = lat2 * math.Pi / 180.0
	lon2 = lon2 * math.Pi / 180.0

	// radius of earth in metres
	var r float64 = 6378100
	// P
	rho1 := r * math.Cos(lat1)
	z1 := r * math.Sin(lat1)
	x1 := rho1 * math.Cos(lon1)
	y1 := rho1 * math.Sin(lon1)
	// Q
	rho2 := r * math.Cos(lat2)
	z2 := r * math.Sin(lat2)
	x2 := rho2 * math.Cos(lon2)
	y2 := rho2 * math.Sin(lon2)
	// Dot product
	dot := x1*x2 + y1*y2 + z1*z2
	cos_theta := dot / (r * r)
	theta := math.Acos(cos_theta)
	// Distance in Metres
	return r * theta
}
