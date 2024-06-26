package promql

import (
	"encoding/json"
	"fmt"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
)

// GetJsonData just gets the json in easier to work with type. It's used on multiple places which isn't super effective
// but only when creating a client which should not happen often anyway.
func GetJsonData(settings backend.DataSourceInstanceSettings) (map[string]any, error) {
	var jsonData map[string]any
	err := json.Unmarshal(settings.JSONData, &jsonData)
	if err != nil {
		return nil, fmt.Errorf("error unmarshalling JSONData: %w", err)
	}
	return jsonData, nil
}

func removeUrlEndingSlash(url string) string {
	length := len(url)
	if length > 0 && url[length-1] == '/' {
		return url[:len(url)-1]
	}

	return url
}
