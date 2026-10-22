import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Col, Row } from 'antd'
import {
  AdminPageHeader,
  AdminPanel,
  AdminQueryState,
  chartEntries,
  useAdminStats,
} from './AdminShared'

function Chart({ children, height = 300 }: { children: React.ReactNode; height?: number }) {
  return (
    <div className="admin-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
    </div>
  )
}

function EmptyChart({ text }: { text: string }) {
  return <div className="admin-empty">{text}</div>
}

export function AdminAnalytics() {
  const statsQuery = useAdminStats()
  const stats = statsQuery.data
  const departments = chartEntries(stats?.jobs_by_department)
  const sources = chartEntries(stats?.jobs_by_source).map((item) => {
    try {
      return { ...item, name: new URL(item.name).hostname.replace(/^www\./, '') }
    } catch {
      return item
    }
  })
  const locations = chartEntries(stats?.jobs_by_location).slice(0, 15)
  const skills = chartEntries(stats?.frequently_requested_skills)
  const collectionTrends = stats?.collection_trends || []
  const userGrowth = Object.entries(stats?.user_growth || {}).map(([date, users]) => ({ date, users }))

  return (
    <div className="admin-page">
      <AdminPageHeader
        title="Analytics & reports"
        description="Explore job inventory patterns, requested skills, collection trends, and account growth."
      />
      <AdminQueryState loading={statsQuery.isPending} error={statsQuery.error} retry={() => void statsQuery.refetch()}>
        {stats && (
          <Row gutter={[18, 18]}>
            <Col xs={24} xl={12}>
              <AdminPanel title="Jobs by department">
                {departments.length ? (
                  <Chart>
                    <BarChart data={departments} margin={{ top: 8, right: 12, left: -16, bottom: 54 }}>
                      <CartesianGrid stroke="#edf1f7" vertical={false} />
                      <XAxis dataKey="name" angle={-25} textAnchor="end" interval={0} height={70} tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Jobs" fill="#3478f6" radius={[5, 5, 0, 0]} />
                    </BarChart>
                  </Chart>
                ) : <EmptyChart text="No department data is available." />}
              </AdminPanel>
            </Col>
            <Col xs={24} xl={12}>
              <AdminPanel title="Jobs by source">
                {sources.length ? (
                  <Chart>
                    <BarChart data={sources} layout="vertical" margin={{ top: 4, right: 24, left: 12, bottom: 4 }}>
                      <CartesianGrid stroke="#edf1f7" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Jobs" fill="#6758d6" radius={[0, 5, 5, 0]} />
                    </BarChart>
                  </Chart>
                ) : <EmptyChart text="No source data is available." />}
              </AdminPanel>
            </Col>
            <Col xs={24} xl={12}>
              <AdminPanel title="Jobs by location">
                {locations.length ? (
                  <Chart>
                    <BarChart data={locations} layout="vertical" margin={{ top: 4, right: 24, left: 20, bottom: 4 }}>
                      <CartesianGrid stroke="#edf1f7" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Jobs" fill="#10a58e" radius={[0, 5, 5, 0]} />
                    </BarChart>
                  </Chart>
                ) : <EmptyChart text="No location data is available." />}
              </AdminPanel>
            </Col>
            <Col xs={24} xl={12}>
              <AdminPanel title="Frequently requested skills">
                {skills.length ? (
                  <Chart>
                    <BarChart data={skills} layout="vertical" margin={{ top: 4, right: 24, left: 12, bottom: 4 }}>
                      <CartesianGrid stroke="#edf1f7" horizontal={false} />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Job listings" fill="#e19a26" radius={[0, 5, 5, 0]} />
                    </BarChart>
                  </Chart>
                ) : <EmptyChart text="No skill information is available." />}
              </AdminPanel>
            </Col>
            <Col xs={24}>
              <AdminPanel title="Collection trends over time">
                {collectionTrends.length ? (
                  <Chart height={340}>
                    <LineChart data={collectionTrends} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                      <CartesianGrid stroke="#edf1f7" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="runs" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="jobs" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line yAxisId="runs" type="monotone" dataKey="runs" name="Collection runs" stroke="#3478f6" strokeWidth={2} dot={false} />
                      <Line yAxisId="jobs" type="monotone" dataKey="jobs" name="Jobs collected" stroke="#10a58e" strokeWidth={2} dot={false} />
                    </LineChart>
                  </Chart>
                ) : <EmptyChart text="No collection trend data is available." />}
              </AdminPanel>
            </Col>
            <Col xs={24}>
              <AdminPanel title="User growth">
                {userGrowth.length ? (
                  <Chart height={320}>
                    <LineChart data={userGrowth} margin={{ top: 12, right: 20, left: 0, bottom: 8 }}>
                      <CartesianGrid stroke="#edf1f7" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="users" name="New registrations" stroke="#6758d6" strokeWidth={2} />
                    </LineChart>
                  </Chart>
                ) : <EmptyChart text="No user registration dates are available." />}
              </AdminPanel>
            </Col>
          </Row>
        )}
      </AdminQueryState>
    </div>
  )
}
