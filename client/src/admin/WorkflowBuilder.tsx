import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { api } from '../services/api.js';
import {
  Play,
  Save,
  Download,
  Power,
  RotateCcw,
  Undo2,
  Redo2,
  History,
  Copy,
  Trash2,
  Loader2,
  Check,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { CustomWorkflowNode } from './workflow/CustomWorkflowNode.js';
import { AdvancedScheduler } from './workflow/AdvancedScheduler.js';
import { NodeSidebar, NodeTemplate } from './workflow/NodeSidebar.js';
import { NodeConfigPanel } from './workflow/NodeConfigPanel.js';
import { WorkflowHistoryModal } from './workflow/WorkflowHistoryModal.js';
import {
  TestExecutionPanel,
  TestExecutionStep,
  TestLogEntry,
} from './workflow/TestExecutionPanel.js';

const DEFAULT_AVAILABLE_PROVIDERS = [
  { slug: 'antigravity', name: 'Google Antigravity CLI (agy)' },
  { slug: 'codex', name: 'OpenAI Codex CLI (codex)' },
  { slug: 'gemini', name: 'Google Gemini' },
  { slug: 'openrouter', name: 'OpenRouter' },
  { slug: 'groq', name: 'Groq (LPU)' },
  { slug: 'tgpt', name: 'TGPT (Open Source)' },
  { slug: 'ollama', name: 'Ollama (Local)' },
  { slug: 'openai', name: 'OpenAI' },
];

export const WorkflowBuilder: React.FC = () => {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [currentWorkflow, setCurrentWorkflow] = useState<any>(null);
  const [availableProviders, setAvailableProviders] = useState<Array<{ slug: string; name: string }>>(DEFAULT_AVAILABLE_PROVIDERS);

  // Canvas nodes & edges
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Undo / Redo history stacks
  const [history, setHistory] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const [future, setFuture] = useState<Array<{ nodes: Node[]; edges: Edge[] }>>([]);

  // Active drawer tab: 'palette' | 'config' | 'scheduler'
  const [activeTab, setActiveTab] = useState<'palette' | 'config' | 'scheduler'>('palette');

  // Workflow Global Settings
  const [workflowSettings, setWorkflowSettings] = useState<{
    timingMode: 'cron' | 'interval' | 'webhook' | 'rss_discovery';
    cronExpression: string;
    intervalMins: number;
    cooldownMins: number;
    webhookSecret: string;
    outboundWebhookUrl: string;
    autoPublishEnabled: boolean;
    startDate?: string;
    endDate?: string;
    timezone?: string;
    lastExecutedAt?: string;
    lastGeneratedArticleTitle?: string;
    lastGeneratedArticleId?: string;
  }>({
    timingMode: 'cron',
    cronExpression: '0 */2 * * *',
    intervalMins: 60,
    cooldownMins: 30,
    webhookSecret: '',
    outboundWebhookUrl: '',
    autoPublishEnabled: true,
    timezone: 'Asia/Kolkata',
  });

  // Dynamic Provider Models
  const [providerModels, setProviderModels] = useState<Record<string, any[]>>({});

  // Auto-Save / Save status indicator
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const isInitialLoad = useRef(true);

  // Execution & Execution Modal State
  const [isRunning, setIsRunning] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [executionsList, setExecutionsList] = useState<any[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  // Dedicated Live Test Execution State
  const [testExecution, setTestExecution] = useState<{
    isOpen: boolean;
    isRunning: boolean;
    status: 'idle' | 'running' | 'success' | 'failed';
    currentStepIndex: number;
    steps: TestExecutionStep[];
    logs: TestLogEntry[];
    createdArticle?: any;
    durationMs?: number;
  }>({
    isOpen: false,
    isRunning: false,
    status: 'idle',
    currentStepIndex: -1,
    steps: [],
    logs: [],
    createdArticle: null,
    durationMs: 0,
  });

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; node: Node } | null>(null);

  // Node types registration for @xyflow/react
  const nodeTypes = useMemo(
    () => ({
      custom: CustomWorkflowNode,
      default: CustomWorkflowNode,
    }),
    []
  );

  // Push state to undo stack
  const recordHistory = useCallback(() => {
    setHistory((prev) => [...prev.slice(-20), { nodes, edges }]);
    setFuture([]);
  }, [nodes, edges]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [{ nodes, edges }, ...prev]);
    setNodes(previous.nodes);
    setEdges(previous.edges);
  }, [history, nodes, edges, setNodes, setEdges]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, { nodes, edges }]);
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [future, nodes, edges, setNodes, setEdges]);

  // Load Workflows and Dynamic Models
  useEffect(() => {
    loadWorkflows();
    loadDynamicModels();
  }, []);

  const loadWorkflows = async () => {
    try {
      const data = await api.getWorkflows();
      if (Array.isArray(data) && data.length > 0) {
        setWorkflows(data);
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('selected_workflow_id') : null;
        const target = (savedId && data.find((w: any) => w.id === savedId)) || data[0];
        selectWorkflow(target);
      } else {
        await handleCreateDefaultWorkflow();
      }
    } catch (err: any) {
      console.error('[WorkflowBuilder] Error loading workflows:', err.message);
    }
  };

  const loadDynamicModels = async () => {
    try {
      const providersList = await api.getAIProviders(true);
      if (Array.isArray(providersList) && providersList.length > 0) {
        setAvailableProviders(
          providersList.map((p: any) => ({
            slug: p.slug,
            name: p.name,
          }))
        );
        const map: Record<string, any[]> = {};
        for (const p of providersList) {
          const checkedModels = (p.models || []).filter((m: any) => m.isChecked !== false);
          if (checkedModels.length > 0) {
            map[p.slug] = checkedModels.map((m: any) => ({
              id: m.modelId,
              name: m.displayName || m.modelId,
            }));
          }
        }
        setProviderModels((prev) => ({ ...prev, ...map }));
      }
    } catch (e: any) {
      console.warn('Error loading dynamic models:', e.message);
    }
  };

  const handleCreateDefaultWorkflow = async () => {
    const defaultNodes: Node[] = [
      {
        id: '1',
        type: 'custom',
        position: { x: 60, y: 150 },
        data: {
          label: 'Schedule Trigger',
          nodeType: 'trigger',
          category: 'trigger',
          config: { timing: 'Scheduled (IST)' },
        },
      },
      {
        id: '2',
        type: 'custom',
        position: { x: 330, y: 150 },
        data: {
          label: 'Poll RSS Feeds',
          nodeType: 'research',
          category: 'action',
          config: { maxStories: 5 },
        },
      },
      {
        id: '3',
        type: 'custom',
        position: { x: 600, y: 150 },
        data: {
          label: 'AI Article Outline',
          nodeType: 'ai',
          category: 'action',
          config: { provider: 'gemini', model: 'gemini-2.5-flash' },
        },
      },
      {
        id: '4',
        type: 'custom',
        position: { x: 870, y: 150 },
        data: {
          label: 'AI Full Article Draft',
          nodeType: 'ai',
          category: 'action',
          config: { provider: 'gemini', model: 'gemini-2.5-flash' },
        },
      },
      {
        id: '5',
        type: 'custom',
        position: { x: 1140, y: 150 },
        data: {
          label: '16:9 Cover Image',
          nodeType: 'image',
          category: 'action',
          config: {
            provider: 'antigravity',
            model: 'gemini-3.8-flash',
            fallback1Provider: 'codex',
            fallback1Model: 'gpt-6-luna',
            fallback2Provider: 'gemini',
            fallback2Model: 'imagen-3.0-generate-002',
            style: '16:9 Editorial illustration, sleek dark mode palette',
            aspectRatio: '16:9',
            autoPublish: true,
          },
        },
      },
      {
        id: '6',
        type: 'custom',
        position: { x: 1410, y: 150 },
        data: {
          label: 'Auto-Publish Article',
          nodeType: 'publishing',
          category: 'action',
          config: { autoPublish: true },
        },
      },
    ];

    const defaultEdges: Edge[] = [
      { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e2-3', source: '2', target: '3', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e3-4', source: '3', target: '4', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e4-5', source: '4', target: '5', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
      { id: 'e5-6', source: '5', target: '6', type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } },
    ];

    try {
      const created = await api.createWorkflow({
        name: 'Autonomous Editorial Pipeline',
        description: 'Scheduled news discovery, AI synthesis, 16:9 cover image, and auto-publishing.',
        isActive: true,
        triggerType: 'cron',
        cronExpression: '0 */2 * * *',
        nodesJson: defaultNodes,
        edgesJson: defaultEdges,
        settingsJson: {
          timingMode: 'cron',
          cronExpression: '0 */2 * * *',
          cooldownMins: 30,
          autoPublishEnabled: true,
          timezone: 'Asia/Kolkata',
        },
      });
      setWorkflows([created]);
      selectWorkflow(created);
    } catch (e: any) {
      console.error(e);
    }
  };

  const selectWorkflow = (wf: any) => {
    setCurrentWorkflow(wf);
    if (typeof window !== 'undefined' && wf?.id) {
      localStorage.setItem('selected_workflow_id', wf.id);
    }
    const rawNodes = Array.isArray(wf.nodesJson) ? wf.nodesJson : [];
    const normalizedNodes = rawNodes.map((n: any) => ({
      ...n,
      type: 'custom',
    }));
    const rawEdges = Array.isArray(wf.edgesJson) ? wf.edgesJson : [];
    const normalizedEdges = rawEdges.map((e: any) => ({
      ...e,
      type: e.type || 'smoothstep',
      markerEnd: e.markerEnd || { type: MarkerType.ArrowClosed },
    }));

    setNodes(normalizedNodes);
    setEdges(normalizedEdges);
    setSelectedNodeId(null);
    setHistory([]);
    setFuture([]);

    const st = wf.settingsJson || {};
    const effectiveCron = st.cronExpression || wf.cronExpression || '0 */2 * * *';
    setWorkflowSettings({
      timingMode: st.timingMode || (wf.triggerType === 'webhook' ? 'webhook' : 'cron'),
      cronExpression: effectiveCron,
      intervalMins: st.intervalMins || 60,
      cooldownMins: st.cooldownMins ?? 30,
      webhookSecret: st.webhookSecret || '',
      outboundWebhookUrl: st.outboundWebhookUrl || '',
      autoPublishEnabled: st.autoPublishEnabled !== false,
      startDate: st.startDate || '',
      endDate: st.endDate || '',
      timezone: st.timezone || 'Asia/Kolkata',
      lastExecutedAt: st.lastExecutedAt,
      lastGeneratedArticleTitle: st.lastGeneratedArticleTitle,
      lastGeneratedArticleId: st.lastGeneratedArticleId,
    });
  };

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => {
      if (connection.source === connection.target) return false;
      const targetNode = nodes.find((n) => n.id === connection.target);
      const targetType = (targetNode?.data as any)?.nodeType;
      if (targetType === 'trigger' || targetType === 'webhook') return false;
      return true;
    },
    [nodes]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      recordHistory();
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: 'smoothstep',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
          },
          eds
        )
      );
    },
    [setEdges, recordHistory]
  );

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        handleDeleteNode(selectedNodeId);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd' && selectedNodeId) {
        e.preventDefault();
        const nodeToDup = nodes.find((n) => n.id === selectedNodeId);
        if (nodeToDup) handleDuplicateNode(nodeToDup);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, nodes, handleUndo, handleRedo]);

  const handleAddNodeFromTemplate = (template: NodeTemplate) => {
    recordHistory();
    const newId = `${Date.now()}`;
    const xPos = 200 + Math.random() * 60;
    const yPos = 120 + Math.random() * 60;

    const newNode: Node = {
      id: newId,
      type: 'custom',
      position: { x: xPos, y: yPos },
      data: {
        label: template.label,
        nodeType: template.nodeType,
        category: template.category,
        config: { ...template.defaultConfig },
      },
    };

    setNodes((nds) => [...nds, newNode]);
    setSelectedNodeId(newId);
    setActiveTab('config');
  };

  const handleDuplicateNode = (node: Node) => {
    recordHistory();
    const newId = `${Date.now()}`;
    const duplicated: Node = {
      ...node,
      id: newId,
      position: { x: node.position.x + 30, y: node.position.y + 30 },
      selected: true,
      data: {
        ...node.data,
        label: `${(node.data as any).label} (Copy)`,
      },
    };
    setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), duplicated]);
    setSelectedNodeId(newId);
  };

  const handleDeleteNode = (nodeId: string) => {
    recordHistory();
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleUpdateNodeConfig = (key: string, value: any) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== selectedNodeId) return n;
        const currentData = (n.data as any) || {};
        return {
          ...n,
          data: {
            ...currentData,
            config: {
              ...(currentData.config || {}),
              [key]: value,
            },
          },
        };
      })
    );
  };

  const handleUpdateNodeLabel = (newLabel: string) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNodeId
          ? { ...n, data: { ...(n.data as any), label: newLabel } }
          : n
      )
    );
  };

  const handleSaveWorkflow = async (showNotification = true) => {
    if (!currentWorkflow) return;
    try {
      setSaveStatus('saving');
      const updated = await api.updateWorkflow(currentWorkflow.id, {
        name: currentWorkflow.name,
        triggerType: workflowSettings.timingMode,
        cronExpression: workflowSettings.cronExpression,
        nodesJson: nodes,
        edgesJson: edges,
        settingsJson: {
          ...currentWorkflow.settingsJson,
          ...workflowSettings,
          cronExpression: workflowSettings.cronExpression,
          timingMode: workflowSettings.timingMode,
        },
      });
      setCurrentWorkflow(updated);
      setWorkflows((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      if (typeof window !== 'undefined') {
        localStorage.setItem('selected_workflow_id', updated.id);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2500);
      if (showNotification) {
        // Non-blocking save confirmation
      }
    } catch (err: any) {
      setSaveStatus('error');
      if (showNotification) {
        alert(`Save failed: ${err.message}`);
      }
    }
  };

  // Auto-save debounced effect: automatically persists edits so nothing is lost on page refresh
  useEffect(() => {
    if (isInitialLoad.current) {
      if (currentWorkflow?.id) {
        isInitialLoad.current = false;
      }
      return;
    }
    if (!currentWorkflow?.id) return;

    const timer = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        const updated = await api.updateWorkflow(currentWorkflow.id, {
          name: currentWorkflow.name,
          triggerType: workflowSettings.timingMode,
          cronExpression: workflowSettings.cronExpression,
          nodesJson: nodes,
          edgesJson: edges,
          settingsJson: {
            ...currentWorkflow.settingsJson,
            ...workflowSettings,
            cronExpression: workflowSettings.cronExpression,
            timingMode: workflowSettings.timingMode,
          },
        });
        setCurrentWorkflow(updated);
        setWorkflows((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
        if (typeof window !== 'undefined') {
          localStorage.setItem('selected_workflow_id', updated.id);
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } catch {
        setSaveStatus('error');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [nodes, edges, workflowSettings, currentWorkflow?.name]);

  const handleToggleWorkflowActive = async () => {
    if (!currentWorkflow) return;
    try {
      const res = await api.toggleWorkflow(currentWorkflow.id);
      setCurrentWorkflow(res);
      setWorkflows((prev) => prev.map((w) => (w.id === res.id ? res : w)));
    } catch (err: any) {
      alert(`Could not toggle status: ${err.message}`);
    }
  };

  const handleTestRun = async () => {
    if (!currentWorkflow || isRunning) return;
    setIsRunning(true);

    const startTime = Date.now();
    const initialSteps: TestExecutionStep[] = nodes.map((n) => ({
      nodeId: n.id,
      label: (n.data as any).label || 'Step',
      nodeType: (n.data as any).nodeType || 'action',
      status: 'pending',
    }));

    setTestExecution({
      isOpen: true,
      isRunning: true,
      status: 'running',
      currentStepIndex: 0,
      steps: initialSteps.map((s, i) => (i === 0 ? { ...s, status: 'running' } : s)),
      logs: [
        {
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          label: 'Orchestrator',
          message: `Initiating test flow execution for "${currentWorkflow.name}"...`,
          status: 'running',
        },
      ],
      createdArticle: null,
      durationMs: 0,
    });

    // Mark first node as running on canvas
    setNodes((nds) =>
      nds.map((n, i) => ({
        ...n,
        data: {
          ...(n.data as any),
          isRunning: i === 0,
          isCompleted: false,
        },
      }))
    );

    // Live polling for real-time step progression
    const seenLogs = new Set<string>();
    const pollInterval = setInterval(async () => {
      try {
        const executions = await api.getWorkflowExecutions(currentWorkflow.id);
        if (Array.isArray(executions) && executions.length > 0) {
          const latest = executions[0];
          const stepLogs = Array.isArray(latest.stepLogs) ? latest.stepLogs : [];

          if (stepLogs.length > 0) {
            setTestExecution((prev) => {
              const updatedSteps = [...prev.steps];
              const newLogEntries: TestLogEntry[] = [];
              let runningIdx = -1;

              stepLogs.forEach((log: any) => {
                const targetIdx = updatedSteps.findIndex(
                  (s) => s.nodeId === log.nodeId || s.label.toLowerCase() === (log.label || '').toLowerCase()
                );
                if (targetIdx !== -1) {
                  const stepStatus: 'pending' | 'running' | 'success' | 'failed' =
                    log.status === 'failed' ? 'failed' : log.status === 'running' ? 'running' : 'success';
                  updatedSteps[targetIdx] = {
                    ...updatedSteps[targetIdx],
                    status: stepStatus,
                    outputSummary: log.outputSummary,
                    error: log.error,
                    durationMs: log.durationMs,
                  };
                  if (log.status === 'running') {
                    runningIdx = targetIdx;
                  }
                }

                const logKey = `${log.nodeId}_${log.status}_${log.completedAt || log.startedAt}`;
                if (!seenLogs.has(logKey)) {
                  seenLogs.add(logKey);
                  newLogEntries.push({
                    timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
                    label: log.label || 'Step',
                    message: log.outputSummary || log.error || `Step ${log.status}...`,
                    status: log.status === 'success' ? 'success' : log.status === 'failed' ? 'error' : 'running',
                  });
                }
              });

              if (runningIdx !== -1) {
                const runningNodeId = updatedSteps[runningIdx].nodeId;
                setNodes((nds) =>
                  nds.map((n) => ({
                    ...n,
                    data: {
                      ...(n.data as any),
                      isRunning: n.id === runningNodeId,
                      isCompleted:
                        (n.data as any).isCompleted ||
                        updatedSteps.find((s) => s.nodeId === n.id)?.status === 'success',
                    },
                  }))
                );
              }

              return {
                ...prev,
                currentStepIndex: runningIdx !== -1 ? runningIdx : prev.currentStepIndex,
                steps: updatedSteps,
                logs: newLogEntries.length > 0 ? [...prev.logs, ...newLogEntries] : prev.logs,
              };
            });
          }
        }
      } catch {}
    }, 650);

    try {
      const res = await api.runWorkflow(currentWorkflow.id, {
        headline: 'Next-Gen Autonomous Agent Architectures in 2026',
      });

      clearInterval(pollInterval);
      const totalElapsed = Date.now() - startTime;

      const finalLogs = Array.isArray(res?.logs) ? res.logs : [];
      setTestExecution((prev) => {
        const finalSteps: TestExecutionStep[] = prev.steps.map((s) => {
          const matched = finalLogs.find(
            (l: any) => l.nodeId === s.nodeId || s.label.toLowerCase().includes((l.label || '').toLowerCase())
          );
          if (matched) {
            const stepStatus: 'pending' | 'running' | 'success' | 'failed' =
              matched.status === 'failed' ? 'failed' : matched.status === 'running' ? 'running' : 'success';
            return {
              ...s,
              status: stepStatus,
              outputSummary: matched.outputSummary,
              error: matched.error,
              durationMs: matched.durationMs,
            };
          }
          return { ...s, status: 'success' as const };
        });

        return {
          ...prev,
          isRunning: false,
          status: res?.status === 'failed' ? 'failed' : 'success',
          currentStepIndex: finalSteps.length - 1,
          steps: finalSteps,
          createdArticle: res?.articleCreated,
          durationMs: totalElapsed,
          logs: [
            ...prev.logs,
            {
              timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
              label: 'Orchestrator',
              message: `Test run finished with status: ${res?.status || 'success'} in ${(totalElapsed / 1000).toFixed(1)}s.`,
              status: res?.status === 'failed' ? 'error' : 'success',
            },
          ],
        };
      });

      // Clear isRunning from all canvas nodes, set isCompleted
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: {
            ...(n.data as any),
            isRunning: false,
            isCompleted: res?.status !== 'failed',
          },
        }))
      );

      if (res?.articleCreated) {
        loadWorkflows();
      }
    } catch (err: any) {
      clearInterval(pollInterval);
      const totalElapsed = Date.now() - startTime;

      setTestExecution((prev) => ({
        ...prev,
        isRunning: false,
        status: 'failed',
        durationMs: totalElapsed,
        logs: [
          ...prev.logs,
          {
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            label: 'Error',
            message: `Execution failed: ${err.message}`,
            status: 'error',
          },
        ],
      }));

      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: {
            ...(n.data as any),
            isRunning: false,
          },
        }))
      );
    } finally {
      setIsRunning(false);
    }
  };

  const handleOpenExecutions = async () => {
    if (!currentWorkflow) return;
    try {
      const list = await api.getWorkflowExecutions(currentWorkflow.id);
      setExecutionsList(Array.isArray(list) ? list : []);
      setShowHistoryModal(true);
    } catch (e: any) {
      alert(`Error fetching history: ${e.message}`);
    }
  };

  const handleRetryExecution = async (executionId: string) => {
    setRetryingId(executionId);
    try {
      await api.retryWorkflowExecution(executionId);
      const list = await api.getWorkflowExecutions(currentWorkflow.id);
      setExecutionsList(list);
    } catch (e: any) {
      alert(`Retry error: ${e.message}`);
    } finally {
      setRetryingId(null);
    }
  };

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(
        JSON.stringify(
          { nodes, edges, name: currentWorkflow?.name, settings: workflowSettings },
          null,
          2
        )
      );
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${currentWorkflow?.name || 'workflow'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="space-y-3 w-full h-[calc(100vh-95px)] flex flex-col text-left font-sans">
      {/* COMPACT SINGLE-LINE TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs">
        {/* Left: Title & Status */}
        <div className="flex items-center gap-2 min-w-0">
          {workflows.length > 1 && (
            <select
              value={currentWorkflow?.id || ''}
              onChange={(e) => {
                const target = workflows.find((w) => w.id === e.target.value);
                if (target) selectWorkflow(target);
              }}
              title="Switch workflow"
              className="text-xs bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 max-w-[140px] truncate shrink-0"
            >
              {workflows.map((w, idx) => (
                <option key={w.id} value={w.id}>
                  {w.name || `Workflow ${idx + 1}`}
                </option>
              ))}
            </select>
          )}

          <input
            type="text"
            value={currentWorkflow?.name || ''}
            onChange={(e) => setCurrentWorkflow({ ...currentWorkflow, name: e.target.value })}
            className="font-bold text-sm text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 px-1 py-0.5 focus:border-indigo-600 focus:outline-none min-w-[120px] max-w-[260px] truncate"
          />

          <button
            type="button"
            onClick={handleToggleWorkflowActive}
            className={`px-2 py-0.5 text-[10px] font-bold rounded border flex items-center gap-1 transition-colors shrink-0 whitespace-nowrap ${
              currentWorkflow?.isActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
            }`}
          >
            <Power className="w-2.5 h-2.5" />
            {currentWorkflow?.isActive ? 'Active' : 'Paused'}
          </button>
        </div>

        {/* Right: Controls in a single tight line with no wrapping */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap sm:flex-nowrap justify-end">
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-slate-600">
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              title="Undo (Ctrl+Z)"
              className="p-1 hover:bg-white hover:text-slate-900 rounded disabled:opacity-30 transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={future.length === 0}
              title="Redo (Ctrl+Y)"
              className="p-1 hover:bg-white hover:text-slate-900 rounded disabled:opacity-30 transition-colors"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenExecutions}
            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1 transition-colors shrink-0 whitespace-nowrap"
          >
            <History className="w-3.5 h-3.5 text-slate-500" /> Logs
          </button>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors flex items-center justify-center shrink-0"
            title="View Live Site in New Tab"
            aria-label="View Live Site in New Tab"
          >
            <Eye className="w-3.5 h-3.5" />
          </a>

          <button
            type="button"
            onClick={handleTestRun}
            disabled={isRunning}
            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center gap-1 transition-colors shadow-2xs shrink-0 whitespace-nowrap"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {isRunning ? 'Running...' : 'Test Run'}
          </button>

          <button
            type="button"
            onClick={() => handleSaveWorkflow(true)}
            disabled={saveStatus === 'saving'}
            title="Save Workflow"
            className={`px-2 py-0.5 text-[11px] font-medium rounded-md border flex items-center gap-1 transition-all shrink-0 whitespace-nowrap ${
              saveStatus === 'saving'
                ? 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                : saveStatus === 'saved'
                ? 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                : saveStatus === 'error'
                ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200'
            }`}
          >
            {saveStatus === 'saving' ? (
              <Loader2 className="w-3 h-3 animate-spin text-slate-500 dark:text-slate-400" />
            ) : saveStatus === 'saved' ? (
              <Check className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            ) : saveStatus === 'error' ? (
              <AlertCircle className="w-3 h-3 text-rose-500" />
            ) : (
              <Save className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            )}
            <span>
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            title="Export JSON"
            className="p-1 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* MAIN TWO-COLUMN CANVAS LAYOUT (FLEX ROW PREVENTS COLUMN CRAMPING) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 min-h-0">
        {/* Left Drawer (Stable 300px width prevents tabs from wrapping) */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 bg-white border border-slate-200 rounded-xl p-3 overflow-y-auto space-y-3 flex flex-col shadow-2xs">
          {/* Clean 3-Tab Segmented Switcher */}
          <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 rounded-lg text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('palette')}
              className={`py-1 px-1 text-center truncate whitespace-nowrap rounded-md transition-all ${
                activeTab === 'palette'
                  ? 'bg-white text-indigo-600 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Nodes
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('config')}
              className={`py-1 px-1 text-center truncate whitespace-nowrap rounded-md transition-all ${
                activeTab === 'config'
                  ? 'bg-white text-indigo-600 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Config
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scheduler')}
              className={`py-1 px-1 text-center truncate whitespace-nowrap rounded-md transition-all ${
                activeTab === 'scheduler'
                  ? 'bg-white text-indigo-600 font-bold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Schedule
            </button>
          </div>

          {/* TAB 1: NODE PALETTE */}
          {activeTab === 'palette' && (
            <NodeSidebar onAddNode={handleAddNodeFromTemplate} />
          )}

          {/* TAB 2: NODE CONFIGURATION */}
          {activeTab === 'config' && (
            <NodeConfigPanel
              selectedNode={selectedNode}
              providerModels={providerModels}
              availableProviders={availableProviders}
              onUpdateConfig={handleUpdateNodeConfig}
              onUpdateLabel={handleUpdateNodeLabel}
              onDeleteNode={handleDeleteNode}
              onDuplicateNode={handleDuplicateNode}
            />
          )}

          {/* TAB 3: SCHEDULE (ONLY SINGLE PLACE CRON EXPRESSION LIVES) */}
          {activeTab === 'scheduler' && (
            <AdvancedScheduler
              cronExpression={workflowSettings.cronExpression}
              timingMode={workflowSettings.timingMode}
              intervalMins={workflowSettings.intervalMins}
              startDate={workflowSettings.startDate}
              endDate={workflowSettings.endDate}
              timezone="Asia/Kolkata"
              onChange={(updated) => setWorkflowSettings((prev) => ({ ...prev, ...updated }))}
            />
          )}
        </div>

        {/* Center / Right: REACT FLOW CANVAS (High-performance, no lag-inducing MiniMap) */}
        <div
          className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden relative shadow-inner h-[500px] lg:h-auto"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            const rawData = e.dataTransfer.getData('application/reactflow');
            if (!rawData) return;
            try {
              const template: NodeTemplate = JSON.parse(rawData);
              handleAddNodeFromTemplate(template);
            } catch {}
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeClick={(_e, node) => {
              setSelectedNodeId(node.id);
              setActiveTab('config');
            }}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setContextMenu(null);
            }}
            onNodeContextMenu={(e, node) => {
              e.preventDefault();
              setSelectedNodeId(node.id);
              setContextMenu({ x: e.clientX, y: e.clientY, node });
            }}
            snapToGrid={true}
            snapGrid={[16, 16]}
            fitView
            minZoom={0.2}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} size={1} color="#cbd5e1" />
            <Controls className="!bg-white !border-slate-200 !shadow-xs" />
          </ReactFlow>

          {/* Context Menu on Node Right-Click */}
          {contextMenu && (
            <div
              style={{ top: contextMenu.y - 120, left: contextMenu.x - 280 }}
              className="fixed z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-1 text-xs font-semibold text-slate-700 min-w-[120px] space-y-0.5 animate-in fade-in-50"
            >
              <button
                type="button"
                onClick={() => {
                  handleDuplicateNode(contextMenu.node);
                  setContextMenu(null);
                }}
                className="w-full text-left px-2 py-1 rounded hover:bg-slate-100 flex items-center gap-1.5"
              >
                <Copy className="w-3 h-3 text-slate-500" /> Duplicate
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDeleteNode(contextMenu.node.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-2 py-1 rounded hover:bg-rose-50 text-rose-600 flex items-center gap-1.5"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}

          {/* Real-time Test Execution Section with Steps and Live Logs */}
          <TestExecutionPanel
            isOpen={testExecution.isOpen}
            isRunning={testExecution.isRunning}
            status={testExecution.status}
            currentStepIndex={testExecution.currentStepIndex}
            steps={testExecution.steps}
            logs={testExecution.logs}
            createdArticle={testExecution.createdArticle}
            durationMs={testExecution.durationMs}
            onClose={() => setTestExecution((prev) => ({ ...prev, isOpen: false }))}
          />
        </div>
      </div>

      {/* EXECUTION AUDIT HISTORY MODAL */}
      {showHistoryModal && (
        <WorkflowHistoryModal
          executions={executionsList}
          workflowName={currentWorkflow?.name || 'Pipeline'}
          onClose={() => setShowHistoryModal(false)}
          onRetry={handleRetryExecution}
          retryingId={retryingId}
        />
      )}
    </div>
  );
};
