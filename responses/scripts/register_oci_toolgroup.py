from llama_stack_client import LlamaStackClient


LLAMA_STACK_BASE_URL = "http://localhost:8321"
OCI_TOOLGROUP_ID = "oci-cloud-mcp"
OCI_MCP_URL = "http://localhost:8888/mcp"


def main() -> None:
    client = LlamaStackClient(base_url=LLAMA_STACK_BASE_URL)
    try:
        toolgroup = client.toolgroups.get(OCI_TOOLGROUP_ID)
        print(f"Toolgroup already exists: {toolgroup.identifier}")
        return
    except Exception:
        pass

    client.toolgroups.register(
        provider_id="model-context-protocol",
        toolgroup_id=OCI_TOOLGROUP_ID,
        mcp_endpoint={"uri": OCI_MCP_URL},
    )
    print(f"Registered toolgroup: {OCI_TOOLGROUP_ID}")


if __name__ == "__main__":
    main()
