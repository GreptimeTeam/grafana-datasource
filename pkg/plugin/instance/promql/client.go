package promql

import (
	"context"
	"io"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
	"time"
)

// Client is a custom Prometheus client. Reason for this is that Prom Go client serializes response into its own
// objects, we have to go through them and then serialize again into DataFrame which isn't very efficient. Using custom
// client we can parse response directly into DataFrame.
type Client struct {
	doer    *http.Client
	method  string
	baseUrl string
}

func NewClient(d *http.Client, method, baseUrl string) *Client {
	return &Client{doer: d, method: method, baseUrl: baseUrl}
}

func (c *Client) Do(req *http.Request) (*http.Response, error) {
	return c.doer.Do(req)
}

func (c *Client) QueryRange(ctx context.Context, q *Query) (*http.Response, error) {
	tr := q.TimeRange()
	qv := map[string]string{
		"query": q.Expr,
		"start": formatTime(tr.Start),
		"end":   formatTime(tr.End),
		"step":  strconv.FormatFloat(tr.Step.Seconds(), 'f', -1, 64),
	}

	req, err := c.createQueryRequest(ctx, "api/v1/query_range", qv)
	if err != nil {
		return nil, err
	}

	return c.doer.Do(req)
}

func (c *Client) QueryInstant(ctx context.Context, q *Query) (*http.Response, error) {
	// We do not need a time range here.
	// Instant query evaluates at a single point in time.
	// Using q.TimeRange is aligning the query range to step.
	// Which causes a misleading time point.
	// Instead of aligning we use time point directly.
	// https://prometheus.io/docs/prometheus/latest/querying/api/#instant-queries
	qv := map[string]string{"query": q.Expr, "time": formatTime(q.End)}
	req, err := c.createQueryRequest(ctx, "api/v1/query", qv)
	if err != nil {
		return nil, err
	}

	return c.doer.Do(req)
}

func (c *Client) createQueryRequest(ctx context.Context, endpoint string, qv map[string]string) (*http.Request, error) {
	if strings.ToUpper(c.method) == http.MethodPost {
		u, err := c.createUrl(endpoint, nil)
		if err != nil {
			return nil, err
		}

		v := make(url.Values)
		for key, val := range qv {
			v.Set(key, val)
		}

		return createRequest(ctx, c.method, u, strings.NewReader(v.Encode()))
	}

	u, err := c.createUrl(endpoint, qv)
	if err != nil {
		return nil, err
	}

	return createRequest(ctx, c.method, u, http.NoBody)
}

func (c *Client) createUrl(endpoint string, qs map[string]string) (*url.URL, error) {
	finalUrl, err := url.ParseRequestURI(c.baseUrl)
	if err != nil {
		return nil, err
	}

	finalUrl.Path = path.Join(finalUrl.Path, endpoint)

	// don't re-encode the Query if not needed
	if len(qs) != 0 {
		urlQuery := finalUrl.Query()

		for key, val := range qs {
			urlQuery.Set(key, val)
		}

		finalUrl.RawQuery = urlQuery.Encode()
	}

	return finalUrl, nil
}

func createRequest(ctx context.Context, method string, u *url.URL, bodyReader io.Reader) (*http.Request, error) {
	request, err := http.NewRequestWithContext(ctx, method, u.String(), bodyReader)
	if err != nil {
		return nil, err
	}
	return request, nil
}

func formatTime(t time.Time) string {
	return strconv.FormatFloat(float64(t.Unix())+float64(t.Nanosecond())/1e9, 'f', -1, 64)
}
