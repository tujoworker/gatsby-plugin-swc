import { graphql } from 'gatsby'

const ComponentName = ({ data }) => {
  return (
    <pre css={{ color: 'yellow', background: 'black' }}>
      1 {JSON.stringify(data, null, 4)}
    </pre>
  )
}

export const query = graphql`
  {
    site {
      buildTime
    }
  }
`

export default ComponentName
