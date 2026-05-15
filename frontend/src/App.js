import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

const api = axios.create({ 
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
});

function App() {
  const [servers, setServers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [serverForm, setServerForm] = useState({ name: '', ipAddress: '', customerId: '', environment: 'onprem', hypervisor: 'esxi' });
  const [jobForm, setJobForm] = useState({ name: '', type: 'backup', serverId: '', customerId: '' });

  const loadServers = async () => {
    const response = await api.get('/servers');
    setServers(response.data);
  };

  const loadJobs = async () => {
    const response = await api.get('/jobs');
    setJobs(response.data);
  };

  useEffect(() => {
    loadServers();
    loadJobs();
  }, []);

  const handleServerSubmit = async (event) => {
    event.preventDefault();
    await api.post('/servers', serverForm);
    setServerForm({ name: '', ipAddress: '', customerId: '', environment: 'onprem', hypervisor: 'esxi' });
    loadServers();
  };

  const handleJobSubmit = async (event) => {
    event.preventDefault();
    await api.post('/jobs', jobForm);
    setJobForm({ name: '', type: 'backup', serverId: '', customerId: '' });
    loadJobs();
  };

  const installAgent = async (serverId) => {
    await api.post(`/servers/${serverId}/install-agent`);
    loadServers();
  };

  const runJob = async (jobId) => {
    await api.post(`/jobs/${jobId}/run`);
    loadJobs();
  };

  return (
    <div className="App">
      <header>
        <h1>Backup System Dashboard</h1>
        <p>Manage servers, jobs, and agent deployment for on-prem and cloud environments.</p>
      </header>

      <section>
        <h2>Add Server</h2>
        <form onSubmit={handleServerSubmit}>
          <label>Name</label>
          <input value={serverForm.name} onChange={(e) => setServerForm({ ...serverForm, name: e.target.value })} required />
          <label>IP Address</label>
          <input value={serverForm.ipAddress} onChange={(e) => setServerForm({ ...serverForm, ipAddress: e.target.value })} required />
          <label>Customer ID</label>
          <input value={serverForm.customerId} onChange={(e) => setServerForm({ ...serverForm, customerId: e.target.value })} required />
          <label>Environment</label>
          <select value={serverForm.environment} onChange={(e) => setServerForm({ ...serverForm, environment: e.target.value })}>
            <option value="onprem">On-Prem</option>
            <option value="cloud">Cloud</option>
          </select>
          <label>Hypervisor</label>
          <select value={serverForm.hypervisor} onChange={(e) => setServerForm({ ...serverForm, hypervisor: e.target.value })}>
            <option value="esxi">ESXi</option>
            <option value="hyperv">Hyper-V</option>
            <option value="kvm">KVM</option>
          </select>
          <button type="submit">Add Server</button>
        </form>
      </section>

      <section>
        <h2>Servers</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>IP</th>
              <th>Customer</th>
              <th>Env</th>
              <th>Hypervisor</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {servers.map((server) => (
              <tr key={server._id}>
                <td>{server.name}</td>
                <td>{server.ipAddress}</td>
                <td>{server.customerId}</td>
                <td>{server.environment}</td>
                <td>{server.hypervisor}</td>
                <td>{server.status}</td>
                <td>
                  <button onClick={() => installAgent(server._id)}>Install Agent</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Create Job</h2>
        <form onSubmit={handleJobSubmit}>
          <label>Name</label>
          <input value={jobForm.name} onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })} required />
          <label>Type</label>
          <select value={jobForm.type} onChange={(e) => setJobForm({ ...jobForm, type: e.target.value })}>
            <option value="backup">Backup</option>
            <option value="restore">Restore</option>
            <option value="replicate">Replicate</option>
          </select>
          <label>Server</label>
          <select value={jobForm.serverId} onChange={(e) => setJobForm({ ...jobForm, serverId: e.target.value })} required>
            <option value="">Select server</option>
            {servers.map((server) => (
              <option key={server._id} value={server._id}>{server.name} ({server.ipAddress})</option>
            ))}
          </select>
          <label>Customer ID</label>
          <input value={jobForm.customerId} onChange={(e) => setJobForm({ ...jobForm, customerId: e.target.value })} required />
          <button type="submit">Create Job</button>
        </form>
      </section>

      <section>
        <h2>Jobs</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Server</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job._id}>
                <td>{job.name}</td>
                <td>{job.type}</td>
                <td>{job.serverId?.name || 'Unknown'}</td>
                <td>{job.customerId}</td>
                <td>{job.status}</td>
                <td>
                  <button onClick={() => runJob(job._id)}>Start</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export default App;