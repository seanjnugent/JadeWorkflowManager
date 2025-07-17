import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Edit, Save, ChevronLeft } from 'lucide-react';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

const EditWorkflow = () => {
    const { workflowId } = useParams();
    const navigate = useNavigate();
    const [workflowDetails, setWorkflowDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setLoading(true);
        fetch(`${API_BASE_URL}/workflows/workflow/${workflowId}`, {
            headers: { 'accept': 'application/json' }
        })
            .then(response => response.json())
            .then(data => setWorkflowDetails(data))
            .catch(error => console.error('Error:', error))
            .finally(() => setLoading(false));
    }, [workflowId]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetch(`${API_BASE_URL}/workflows/workflow/update`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'accept': 'application/json'
                },
                body: JSON.stringify({
                    workflow_id: workflowId,
                    parameters: workflowDetails.workflow.parameters,
                    destination: workflowDetails.workflow.destination,
                    destination_config: workflowDetails.workflow.destination_config
                })
            });
            if (response.ok) {
                navigate(`/workflows/${workflowId}`);
            } else {
                console.error('Failed to save workflow');
            }
        } catch (error) {
            console.error('Error saving workflow:', error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <span className="spinner spinner-large"></span>
            </div>
        );
    }

    if (!workflowDetails) {
        return <div className="min-h-screen flex justify-center items-center">No workflow details available.</div>;
    }

    const { workflow } = workflowDetails;

    return (
        <motion.div
            className="min-h-screen bg-gray-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8 bg-white glass-effect rounded-lg shadow-sm p-6 hover-scale">
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <button
                                onClick={() => navigate(`/workflows/workflow/${workflowId}`)}
                                className="text-gray-600 hover:text-gray-800 text-sm flex items-center mb-4"
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" /> Back to Workflow
                            </button>
                            <div className="mb-6">
                                <div className="flex justify-between items-center">
                                    <h1 className="text-3xl font-bold text-gray-900">Edit Workflow</h1>
                                </div>
                            </div>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSave}
                            className="bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg p-4 shadow-lg shadow-blue-500/20 transition-all flex items-center"
                            disabled={saving}
                        >
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center mr-3">
                                {saving ? (
                                    <span className="spinner spinner-small"></span>
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-bold">Save Changes</h3>
                            </div>
                        </motion.button>
                    </div>
                    <div className="mt-6 pt-6 border-t border-gray-100">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Workflow Name</label>
                                <input
                                    type="text"
                                    value={workflow.name}
                                    onChange={(e) => setWorkflowDetails({...workflowDetails, workflow: {...workflow, name: e.target.value}})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Description</label>
                                <textarea
                                    value={workflow.description}
                                    onChange={(e) => setWorkflowDetails({...workflowDetails, workflow: {...workflow, description: e.target.value}})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Parameters</label>
                                <textarea
                                    value={JSON.stringify(workflow.parameters, null, 2)}
                                    onChange={(e) => setWorkflowDetails({...workflowDetails, workflow: {...workflow, parameters: JSON.parse(e.target.value)}})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Destination</label>
                                <input
                                    type="text"
                                    value={workflow.destination}
                                    onChange={(e) => setWorkflowDetails({...workflowDetails, workflow: {...workflow, destination: e.target.value}})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Destination Config</label>
                                <textarea
                                    value={JSON.stringify(workflow.destination_config, null, 2)}
                                    onChange={(e) => setWorkflowDetails({...workflowDetails, workflow: {...workflow, destination_config: JSON.parse(e.target.value)}})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default EditWorkflow;
