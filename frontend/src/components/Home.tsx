import AlarmDataTable from "./AlarmDataTable";
import LiveDataTable from "./LiveDataTable";

const Home = () => {
  return (
    <div className="row">
      <div>
        <div className="card">
          <AlarmDataTable />
        </div>
        <div className="card">
          <LiveDataTable />
        </div>
      </div>
    </div>
  );
};

export default Home;
